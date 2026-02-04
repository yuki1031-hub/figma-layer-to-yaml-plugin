/// <reference types="@figma/plugin-typings" />
import { showUI } from '@create-figma-plugin/utilities'

export default function () {
  showUI({ height: 600, width: 500 })

  figma.ui.onmessage = (msg) => {
    if (msg.type === 'GENERATE') {
      
      const selection = figma.currentPage.selection as any[]
      if (selection.length === 0) {
        figma.ui.postMessage({ type: 'RESULT', code: "エラー：親フレームを選択してください" })
        return
      }

      const root = selection[0]
      let outputCode = ""

      const findTextContent = (node: any): string | null => {
        if (node.type === "TEXT") return node.characters
        if (node.children) {
          for (const child of node.children) {
            const found = findTextContent(child)
            if (found) return found
          }
        }
        return null
      }

      const processNodes = (rawNodes: any, depth: number = 0) => {
        const nodes = [...(rawNodes as any[])].reverse()
        const indent = " ".repeat(depth * 4)

        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i]
          if (!node.visible) continue

          const name = node.name.toLowerCase()

          // 1. ルート分岐 (A, B)
          if (name === "a" || name === "b") {
            outputCode += `\n  ${node.name}\n`
            if (node.children) processNodes(node.children, depth + 1)
            continue
          }

          // 2. 画像セット (image)
          if (name.includes("image") && !name.includes("image_url")) {
             let imgUrl = ""
             let transitionUrl = ""
             let offset = 1

             while (i + offset < nodes.length) {
               const nextNode = nodes[i + offset]
               const nextName = nextNode.name.toLowerCase()

               if (nextName.includes("image_url")) {
                 const text = findTextContent(nextNode)
                 if (text) imgUrl = text
                 offset++
               } else if (nextName.includes("link")) {
                 const text = findTextContent(nextNode)
                 if (text) transitionUrl = text
                 offset++
               } else {
                 break
               }
             }

             outputCode += `${indent}- image:\n`
             outputCode += `${indent}    - image:\n${indent}        url: ${imgUrl || "(URL未設定)"}\n`
             if (transitionUrl) {
               outputCode += `${indent}    - transition:\n${indent}        url: ${transitionUrl}\n`
             }
             i += (offset - 1)
             continue
          }

          // 3. 選択肢 (▼入り)
          if (node.type === "TEXT" && node.characters.includes("▼")) {
            const title = node.characters
            const options: string[] = []
            let offset = 1
            while (i + offset < nodes.length && options.length < 2) {
              const nextNode = nodes[i + offset]
              if (nextNode.type === "TEXT") {
                options.push(nextNode.characters)
                offset++
              } else {
                break
              }
            }
            outputCode += `${indent}- selection:\n${indent}    - text: ${title}\n`
            if (options.length > 0) outputCode += `${indent}    display: ${options[0]}\n${indent}    message: ${options[0]}\n${indent}    move: A\n`
            if (options.length > 1) outputCode += `${indent}    display: ${options[1]}\n${indent}    message: ${options[1]}\n${indent}    move: B\n`
            i += (offset - 1)
            continue
          }

          // 4. 普通のテキスト ＋ 通知
          if (node.type === "TEXT") {
            if (name.includes("image_url") || name.includes("link")) continue
            const text = node.characters
            if (text === "A B" || text.trim() === "") continue

            if (name.includes("通知") || text.startsWith("【通知】")) {
              outputCode += `${indent}  notification: ${text}\n`
              continue
            }

            let notificationText = ""
            if (i + 1 < nodes.length) {
               const nextNode = nodes[i + 1]
               const nextText = "characters" in nextNode ? nextNode.characters : ""
               if (nextNode.name.toLowerCase().includes("通知") || nextText.startsWith("【通知】")) {
                 notificationText = nextText
                 i++
               }
            }

            outputCode += `${indent}- Text: |-\n${indent}    ${text}\n`
            if (notificationText) {
              outputCode += `${indent}  notification: ${notificationText}\n`
            }
            continue
          }

          // 5. 子要素へ再帰
          if (node.children) {
            processNodes(node.children, depth)
          }
        }
      }

      if (root.children) {
         processNodes(root.children)
      } else {
         outputCode = "エラー：フレームの中に何もありません"
      }
      
      figma.ui.postMessage({ type: 'RESULT', code: outputCode })
    }
  }
}