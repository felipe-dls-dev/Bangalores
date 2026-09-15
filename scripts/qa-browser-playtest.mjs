import { spawn } from 'node:child_process'
import http from 'node:http'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9222
const APP_URL = 'http://localhost:4173/'

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function waitForCdp(maxRetries = 20) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      if (res.ok) {
        const pages = await res.json()
        const targetPage = pages.find(p => p.type === 'page' && !p.url.startsWith('chrome-extension')) || pages.find(p => p.type === 'page')
        if (targetPage) return targetPage
      }
    } catch {
      await sleep(250)
    }
  }
  throw new Error('Could not connect to Chrome CDP')
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl
    this.ws = null
    this.id = 1
    this.callbacks = new Map()
    this.eventListeners = new Map()
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl)
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve
      this.ws.onerror = reject
    })
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id)
        this.callbacks.delete(msg.id)
        if (msg.error) reject(new Error(msg.error.message))
        else resolve(msg.result)
      } else if (msg.method) {
        const listeners = this.eventListeners.get(msg.method) ?? []
        listeners.forEach(fn => fn(msg.params))
      }
    }
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++
      this.callbacks.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  on(method, fn) {
    const arr = this.eventListeners.get(method) ?? []
    arr.push(fn)
    this.eventListeners.set(method, arr)
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (res.exceptionDetails) {
      console.error('[CDP Eval Exception]', JSON.stringify(res.exceptionDetails, null, 2))
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text || 'Eval error')
    }
    return res.result?.value
  }

  close() {
    this.ws?.close()
  }
}

async function run() {
  console.log('[QA Playtest] Starting headless Chrome...')
  const profileDir = 'C:\\Users\\Felipe\\.gemini\\antigravity\\brain\\1c544ba1-a090-46c6-9fcb-ffddfb1452fc\\scratch\\chrome-test-profile'
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profileDir}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,800',
    APP_URL,
  ])

  const networkErrors = []
  const consoleMessages = []

  try {
    const pageInfo = await waitForCdp()
    console.log('[QA Playtest] CDP available on', pageInfo.webSocketDebuggerUrl)

    const cdp = new CdpClient(pageInfo.webSocketDebuggerUrl)
    await cdp.connect()

    await cdp.send('Page.enable')
    await cdp.send('Network.enable')
    await cdp.send('Runtime.enable')

    cdp.on('Network.responseReceived', (params) => {
      const { response } = params
      if (response.status >= 400) {
        networkErrors.push({ url: response.url, status: response.status, statusText: response.statusText })
        console.error(`[404/HTTP Error] ${response.status} ${response.statusText} -> ${response.url}`)
      }
    })

    cdp.on('Runtime.consoleAPICalled', (params) => {
      const text = params.args.map(a => a.value ?? JSON.stringify(a)).join(' ')
      consoleMessages.push({ type: params.type, text })
      if (params.type === 'error') {
        console.error(`[Browser Console Error] ${text}`)
      }
    })

    console.log('[QA Playtest] Navigating to', APP_URL)
    await cdp.send('Page.navigate', { url: APP_URL })
    await sleep(2500)

    // Check location
    const origin = await cdp.eval('window.location.origin')
    console.log('[QA Playtest] Window origin:', origin)

    // Test 1: Check wide layout horizontal scroll
    const wideScroll = await cdp.eval(`({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    })`)
    console.log('[QA Check: Wide Viewport (1280px)]', wideScroll)

    // Test 2: Check narrow layout (420px) horizontal scroll
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 420,
      height: 800,
      deviceScaleFactor: 1,
      mobile: true,
    })
    await sleep(500)

    const narrowScroll = await cdp.eval(`({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    })`)
    console.log('[QA Check: Narrow Viewport (420px)]', narrowScroll)

    // Reset to desktop viewport for remaining checks
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await sleep(300)

    // Test 3: Fast-path save injection into localStorage
    console.log('[QA Test] Testing save injection for Steelmere...')
    await cdp.eval(`
      (() => {
        const campaignId = 'campaign_qa_fastpath';
        const baseProps = {
          screen: 'region',
          heroId: 'guerreiro',
          hp: 120,
          gold: 250,
          xp: 15000,
          world: 'steelmere',
          regionId: 'frostgard',
          territory: 'Cumes de Frostgard',
          completedStoryQuests: ['q_cross_oceans'],
          storyChapterId: 'epilogo_luz',
          activeCampaignId: campaignId
        };
        const saveState = {
          ...baseProps,
          campaigns: { [campaignId]: { ...baseProps, savedAt: Date.now() } }
        };
        localStorage.setItem('bangalores-save-v1', JSON.stringify({ state: saveState, version: 0 }));
      })()
    `)

    // Reload page to rehydrate injected state
    await cdp.send('Page.navigate', { url: APP_URL })
    await sleep(2500)

    const currentScreen = await cdp.eval(`window.__DEBUG_SCREEN__ || document.querySelector('.regionmap-shell') ? 'region' : 'other'`)
    console.log('[QA Check: Injected Region Screen]', currentScreen)

    // Test 4: Verify all 7 Steelmere territory maps in browser
    const steelmereTerritories = [
      { id: 'frostgard', name: 'Cumes de Frostgard', weather: 'snow' },
      { id: 'engrenverde', name: 'Engrenverde', weather: null },
      { id: 'trilhouro', name: 'Trilhouro', weather: null },
      { id: 'vulcannis', name: 'Vulcannis', weather: 'ash' },
      { id: 'ferrujal', name: 'Ferrujal', weather: 'smoke' },
      { id: 'coroferro', name: 'Coroferro', weather: 'smoke' },
      { id: 'aetherium', name: 'Aetherium', weather: null }
    ]

    const territoryResults = []
    for (const terr of steelmereTerritories) {
      console.log(`[QA Test] Loading territory: ${terr.name} (${terr.id})...`)
      await cdp.eval(`
        (() => {
          const raw = JSON.parse(localStorage.getItem('bangalores-save-v1') || '{}');
          if (raw.state) {
            raw.state.world = 'steelmere';
            raw.state.regionId = '${terr.id}';
            raw.state.territory = '${terr.name}';
            raw.state.screen = 'region';
            if (raw.state.activeCampaignId && raw.state.campaigns?.[raw.state.activeCampaignId]) {
              Object.assign(raw.state.campaigns[raw.state.activeCampaignId], {
                world: 'steelmere',
                regionId: '${terr.id}',
                territory: '${terr.name}',
                screen: 'region'
              });
            }
            localStorage.setItem('bangalores-save-v1', JSON.stringify(raw));
          }
        })()
      `)
      await cdp.send('Page.navigate', { url: APP_URL })
      await sleep(1500)

      const terrCheck = await cdp.eval(`
        (() => {
          const mapEl = document.querySelector('.regionmap-shell');
          const artEl = document.querySelector('.regionmap-art');
          const bgImg = artEl ? window.getComputedStyle(artEl).backgroundImage : 'none';
          const weatherEl = document.querySelector('.regionmap-weather');
          const weatherClass = weatherEl ? weatherEl.className : 'none';
          const chests = document.querySelectorAll('.regionmap-chest');
          const campfires = document.querySelectorAll('.regionmap-campfire');
          const wanderers = document.querySelectorAll('.regionmap-wanderer');
          const zoomHud = document.querySelector('.regionmap-zoom-hud');

          return {
            hasMap: Boolean(mapEl),
            bgImg,
            weatherClass,
            chestCount: chests.length,
            campfireCount: campfires.length,
            wandererCount: wanderers.length,
            hasZoomHud: Boolean(zoomHud)
          };
        })()
      `)
      console.log(`[QA Check: ${terr.id}]`, terrCheck)
      territoryResults.push({ id: terr.id, ...terrCheck })
    }

    // Test 5: Story cinematics in Chronicle screen
    console.log('[QA Test] Checking Story Cinematics...')
    const chapters = ['prologo', 'forja', 'chama', 'coracao', 'epilogo_luz', 'epilogo_sombra']
    const cinematicResults = []
    for (const chap of chapters) {
      await cdp.eval(`
        (() => {
          const raw = JSON.parse(localStorage.getItem('bangalores-save-v1') || '{}');
          if (raw.state) {
            raw.state.screen = 'chronicle';
            raw.state.storyChapterId = '${chap}';
            localStorage.setItem('bangalores-save-v1', JSON.stringify(raw));
          }
        })()
      `)
      await cdp.send('Page.navigate', { url: APP_URL })
      await sleep(1000)

      const bannerCheck = await cdp.eval(`
        (() => {
          const banner = document.querySelector('.story-campaign-art');
          return {
            hasBanner: Boolean(banner),
            src: banner ? banner.src : 'none',
            complete: banner ? banner.complete : false,
            naturalWidth: banner ? banner.naturalWidth : 0
          };
        })()
      `)
      console.log(`[QA Check: Chapter ${chap} Banner]`, bannerCheck)
      cinematicResults.push({ chapter: chap, ...bannerCheck })
    }

    // Test 6: 15 Boss portraits in Combat
    console.log('[QA Test] Checking 15 Boss portraits in combat...')
    const testBosses = [
      'Capitão dos Bandoleiros',
      'Mestre do Pedágio',
      'Rei Goblin de Abdendriel',
      'Guardião Rúnico Ancestral',
      'Rainha Aracnídea',
      'Titã da Passagem',
      'Mestre Ferreiro Caído',
      'Yeti Alfa de Gelo Eterno',
      'Guardião da Caldeira',
      'Lorde Espectral de Morvath',
      'Sentinela de Pedra de Kholgard',
      'Rei Esquecido de Kholgard',
      'Asterion, Guardião do Sol Negro',
      'Vaelora, Senhora do Véu',
      'Nihraz, Imperador do Vazio'
    ]

    const bossResults = []
    for (const bossName of testBosses) {
      await cdp.eval(`
        (() => {
          const raw = JSON.parse(localStorage.getItem('bangalores-save-v1') || '{}');
          if (raw.state) {
            raw.state.screen = 'combat';
            raw.state.enemy = {
              id: 'test_boss',
              nome: '${bossName.replace(/'/g, "\\'")}',
              ataque: 20,
              vida: 200,
              ouro: 50,
              dificuldade: 5,
              boss: true,
              raridade: 'epico'
            };
            raw.state.enemyHp = 200;
            raw.state.playerTurn = true;
            localStorage.setItem('bangalores-save-v1', JSON.stringify(raw));
          }
        })()
      `)
      await cdp.send('Page.navigate', { url: APP_URL })
      await sleep(800)

      const bossCheck = await cdp.eval(`
        (() => {
          const enemyCard = document.querySelector('.fighter.enemy');
          const img = enemyCard ? enemyCard.querySelector('img') : null;
          return {
            hasEnemyCard: Boolean(enemyCard),
            imgSrc: img ? img.src : 'none',
            complete: img ? img.complete : false,
            naturalWidth: img ? img.naturalWidth : 0
          };
        })()
      `)
      console.log(`[QA Check: Boss "${bossName}"]`, bossCheck)
      bossResults.push({ boss: bossName, ...bossCheck })
    }

    // Summary of findings
    console.log('\n========================================')
    console.log('PLAYTEST REPORT SUMMARY')
    console.log('========================================')
    console.log(`Total 404 / Network Errors: ${networkErrors.length}`)
    if (networkErrors.length > 0) {
      console.log('Network errors detected:', JSON.stringify(networkErrors, null, 2))
    }
    console.log(`Total Console Errors: ${consoleMessages.filter(m => m.type === 'error').length}`)
    console.log('Territory Maps Tested: 7/7')
    console.log('Story Chapters Tested: 6/6')
    console.log('Bosses Tested: 15/15')
    console.log('========================================\n')

    cdp.close()
  } finally {
    chrome.kill()
  }
}

run().catch(err => {
  console.error('[QA Playtest FATAL]', err)
  process.exit(1)
})
