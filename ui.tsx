// @ts-nocheck
import { render, Container, Button, VerticalSpace, Text } from '@create-figma-plugin/ui'
import { h } from 'preact'
import { useState, useEffect } from 'preact/hooks'

function Plugin() {
  const [code, setCode] = useState<string>('フレームを選択してボタンを押してください')

  const handleClick = () => {
    setCode("生成中...")
    parent.postMessage({ pluginMessage: { type: 'GENERATE' } }, '*')
  }

  useEffect(() => {
    const handleMessage = (event) => {
      const message = event.data.pluginMessage
      if (message && message.type === 'RESULT') {
        setCode(message.code)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <Container space="medium">
      <VerticalSpace space="large" />
      <Text align="center" style={{ fontWeight: 'bold' }}>コード生成ツール</Text>
      <VerticalSpace space="medium" />
      <Button fullWidth onClick={handleClick}>
        コードを生成する
      </Button>
      <VerticalSpace space="medium" />
      
      <textarea 
        value={code} 
        style={{ 
          width: '100%', 
          // ■ ここを変更！ (240px → 450px)
          height: '450px', 
          border: '1px solid #ccc', 
          padding: '10px',
          borderRadius: '6px',
          fontFamily: 'monospace',
          fontSize: '12px',
          whiteSpace: 'pre',
          overflow: 'auto',
          resize: 'none'
        }}
        readOnly
      />
    </Container>
  )
}

export default render(Plugin)