import {commands, window, workspace, WorkspaceConfiguration, Disposable} from 'vscode';
import {UtilWord} from './Utils/Word';

export class Configuration {

    private static isReady = false;
    private static extensionNamespace: WorkspaceConfiguration;
    private static editorNamespace: WorkspaceConfiguration;
    private static disposables: Disposable[] = [];

    static init(): void {
        if (this.isReady) {
            return;
        }

        this.isReady = true;

        this.onDidChangeConfiguration();

        this.disposables.push(
            workspace.onDidChangeConfiguration(() => this.onDidChangeConfiguration())
        );
    }

    private static onDidChangeConfiguration(): void {
        this.updateCache();
        this.updateKeybindingContexts();
        this.defaultMode = this.getExtensionSetting<string>('defaultMode');
        UtilWord.updateCharacterKindCache(this.getEditorSetting<string>('wordSeparators'));
    }

    private static updateCache(): void {
        this.extensionNamespace = workspace.getConfiguration('amVim');
        this.editorNamespace = workspace.getConfiguration('editor');
    }

    private static updateKeybindingContexts(): void {
        commands.executeCommand('setContext',
            'amVim.configuration.shouldBindCtrlCommands', this.getExtensionSetting<boolean>('bindCtrlCommands'));
    }

    static getExtensionSetting<T>(section: string, defaultValue?: T): T {
        return this.extensionNamespace.get(section, defaultValue);
    }

    static getEditorSetting<T>(section: string, defaultValue?: T): T {
        return this.editorNamespace.get(section, defaultValue);
    }

    /**
     * Remarks: Workaround undefined bug in native API.
     */
    static getInsertSpace(): boolean {
        if (window.activeTextEditor) {
            const options = window.activeTextEditor.options;
            if (options.insertSpaces !== undefined) {
                return options.insertSpaces as boolean;
            }
        }

        return this.getEditorSetting<boolean>('insertSpaces');
    }

    /**
     * Remarks: Workaround undefined bug in native API.
     */
    static getTabSize(): number {
        if (window.activeTextEditor) {
            const options = window.activeTextEditor.options;
            if (options.tabSize !== undefined) {
                return options.tabSize as number;
            }
        }

        return this.getEditorSetting<number>('tabSize');
    }

    static dispose(): void {
        Disposable.from(...this.disposables).dispose();
    }

}
