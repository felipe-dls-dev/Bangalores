import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Só a regra clássica de dependências de efeito -- de baixo ruído e já achou um
      // caso real (useEffect sem 'defeat' nas deps). As regras de "pureza" do React
      // Compiler (react-hooks/purity, set-state-in-effect etc.) e rules-of-hooks foram
      // deixadas de fora: o projeto tem várias funções internas chamadas useAlgo (ex:
      // useCoopHeroSkill, useItem) que não são hooks de verdade, só seguem a convenção
      // de nome por acaso, e rules-of-hooks trata qualquer use[A-Z] como hook -- viraria
      // uma enchente de falso positivo em vez de rede de segurança.
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': 'off',
      // O estilo do projeto é intencionalmente denso (um componente inteiro por linha);
      // o lint aqui é rede de segurança contra bug real, não formatação.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      // `cond ? doA() : doB()` como statement é usado de propósito em alguns pontos
      // (ex: confirmação de compra na Loja) em vez de if/else, no mesmo estilo denso do resto do arquivo.
      '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
    },
  },
)
