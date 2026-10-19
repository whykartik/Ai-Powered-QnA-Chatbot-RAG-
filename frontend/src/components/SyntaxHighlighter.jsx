import { PrismLight as Prism } from 'react-syntax-highlighter'
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash'
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css'
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript'
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json'
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup'
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python'
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql'
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript'
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

Prism.registerLanguage('bash', bash)
Prism.registerLanguage('sh', bash)
Prism.registerLanguage('css', css)
Prism.registerLanguage('html', markup)
Prism.registerLanguage('javascript', javascript)
Prism.registerLanguage('js', javascript)
Prism.registerLanguage('json', json)
Prism.registerLanguage('markup', markup)
Prism.registerLanguage('python', python)
Prism.registerLanguage('sql', sql)
Prism.registerLanguage('typescript', typescript)
Prism.registerLanguage('yaml', yaml)

function SyntaxHighlighter({ language, value }) {
  return (
    <Prism
      language={language}
      style={oneDark}
      wrapLongLines
      showLineNumbers
      customStyle={{
        margin: 0,
        padding: '16px',
        background: '#0d1117',
        fontSize: '13px',
      }}
    >
      {value}
    </Prism>
  )
}

export default SyntaxHighlighter