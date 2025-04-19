import { ItemView, MarkdownView, Notice, Plugin } from 'obsidian';
import { CanvasData } from 'obsidian/canvas';

export default class ColorSwatchPlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: 'paste-coolors',
			name: 'Paste Color Palette from Copied Coolors Url',
			editorCallback: async (editor, context) => {
				// This regex extracts '-' -separated 6-lengths hex colors.
				// Notice that I don't validate it's an actual URL, because it doesn't really matter.
				const coolorsRegex = /[0-9a-fA-F]{6}(?:-[0-9a-fA-F]{6})+/;
				const clipboardText = await navigator.clipboard.readText();
				const scanResult = coolorsRegex.exec(clipboardText.trim());
				if (scanResult) {
					const palette = scanResult[0]
						.split("-")
						.map(color => "#" + color)
						.join("\n");
					// This is pretty much "paste" in Obsidian.
					editor.replaceSelection('```colors\n' + palette + '\n```\n');
				} else {
					new Notice('Not a Coolors palette URL!');
				}
			}
		});

		// Inline colour swatches — these are read only.
		this.registerMarkdownPostProcessor((el, ctx) => {
			const codeblocks = el.findAll('code');
			for (let codeblock of codeblocks) {
				const text = codeblock.innerHTML;
				// Matching a hex color!
				if (text.match(/^#[0-9a-fA-F]{6}$/)) {
					let paletteEl = codeblock.createDiv({ cls: "palette-inline" });
					codeblock.replaceWith(paletteEl);
					const span = paletteEl.createSpan({ text });
					
					//const swatch = paletteEl.createEl('input', { type: 'color', value: text });
					//swatch.onchange = ev => {
					//	
					//};
					const swatch = paletteEl.createEl('div', { cls: "readonly-swatch" });
					swatch.style = `background-color: ${text};`
				}
			  }		
		});

		// Palette renderer. These swatches update the underlying colour.
		this.registerMarkdownCodeBlockProcessor('colors', (source, el, ctx) => {
			// Each colour on a newline — makes it easier to edit.
			let colors = source.split("\n");
			let paletteElement = el.createDiv({ cls: "palette" });

			colors.forEach((color, index) => {
				let swatch = paletteElement.createEl('input', { type: 'color' });
				swatch.value = color;
				swatch.onchange = (event) => {
					const newColor = (event.target as HTMLInputElement)['value'] ?? swatch.value;
					if (newColor == color) return;

					const view = this.app.workspace.getActiveViewOfType(ItemView);
					if (view) {
						// Make it work inside canvas!!!
						if (view.getViewType() == "canvas") {
							const canvas: CanvasData = (view as any).canvas;
							canvas.nodes.forEach((node: any) => {
								if ((node.contentEl as HTMLElement).contains(swatch)) {
									if (node.text) {
										let info = ctx.getSectionInfo(el);
										if (info) {
											const lineNo = info.lineStart + 1 + index;
											const lines = (node.text as string).split("\n"); // const arrays are still editable lmao (const *T)
											lines[lineNo] = newColor;
											const newText = lines.join('\n');
											node.child.text = newText;
											node.child.dirty = true;
											node.child.requestSave();
											return;
										}
									}

									if (node.file) {
										// Implement code for editing embedded markdown from within other views.
										console.log(node);
										return;
									}
								};
							});

						}

						/// Make it work inside a markdown view!!!
						if (view.getViewType() == "markdown" && view instanceof MarkdownView) {
							const info = ctx.getSectionInfo(el);
							if (info) {
								let lineNo = info.lineStart + 1 + index;
								view.editor.setLine(lineNo, newColor);
								view.requestSave();
							}
						}
					} else {
						new Notice("No view!")
					}
				};
			});
		});
	}
}