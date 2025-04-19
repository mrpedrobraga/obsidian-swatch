import { MarkdownView, Notice, Plugin } from 'obsidian';


export default class ColorSwatchPlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: 'paste-coolors',
			name: 'Paste Color Palette from Copied Coolors Url',
			editorCallback: async (editor, context) => {
				const clipboardText = await navigator.clipboard.readText();
				const coolorsRegex = /[0-9a-fA-F]{6}(?:-[0-9a-fA-F]{6})+/;
				const scanResult = coolorsRegex.exec(clipboardText.trim());
				if (scanResult) {
					const palette = scanResult[0].split("-").map(color => "#" + color).join("\n");
					editor.replaceSelection('```colors\n' + palette + '\n```\n');
				} else {
					new Notice('Not a Coolors palette URL!');
				}
			}
		});
		this.registerMarkdownCodeBlockProcessor('colors', (source, el, ctx) => {
			let paletteElement = el.createDiv({ cls: "palette" });
			let colors = source.split("\n");
			colors.forEach((color, index) => {
				let swatch = paletteElement.createEl('input', { type: 'color' });
				swatch.value = color;
				swatch.onblur = (event) => {
					const newColor = (event.target as HTMLInputElement)['value'] ?? swatch.value;
					if (newColor == color) return;

					const view = this.app.workspace.getActiveViewOfType(MarkdownView);
					const info = ctx.getSectionInfo(el);
					if (info) {
						let lineNo = info.lineStart + 1 + index;
						view?.editor.setLine(lineNo, newColor)
					}
				};
			});
		});
	}
}