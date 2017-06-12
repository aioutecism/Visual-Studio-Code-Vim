import {window, commands, Disposable, ExtensionContext} from 'vscode';
import * as Keys from './Keys';
import {Mode, ModeID} from './Modes/Mode';
import {ModeNormal} from './Modes/Normal';
import {ModeVisual} from './Modes/Visual';
import {ModeVisualLine} from './Modes/VisualLine';
import {ModeInsert} from './Modes/Insert';
import {ActionMode} from './Actions/Mode';
import {ActionMoveCursor} from './Actions/MoveCursor';
import {Configuration} from './Configuration';

export class Dispatcher {

    private _currentMode: Mode;
    get currentMode(): Mode { return this._currentMode; }

    private modes: {[k: string]: Mode} = {
        [ModeID.NORMAL]: new ModeNormal(),
        [ModeID.VISUAL]: new ModeVisual(),
        [ModeID.VISUAL_LINE]: new ModeVisualLine(),
        [ModeID.INSERT]: new ModeInsert(),
    };

    private disposables: Disposable[] = [];

    constructor(context: ExtensionContext) {
        Object.keys(this.modes).forEach(key => {
            let mode = this.modes[key];
            context.subscriptions.push(commands.registerCommand(`amVim.mode.${mode.id}`, () => {
                this.switchMode(mode.id);
            }));
        });

        context.subscriptions.push(commands.registerCommand('type', args => {
            this.inputHandler(args.text)();
        }));

        context.subscriptions.push(commands.registerCommand('replacePreviousChar', args => {
            this.inputHandler(args.text, { replaceCharCnt: args.replaceCharCnt })();
        }));

        Keys.raws.forEach(key => {
            context.subscriptions.push(commands.registerCommand(`amVim.${key}`, this.inputHandler(key)));
        });

        ActionMoveCursor.updatePreferedColumn();

        this.switchMode(Configuration.defaultModeID);

        this.disposables.push(
            window.onDidChangeTextEditorSelection(() => {
                // Ensure this is executed after all pending commands.
                setTimeout(() => {
                    ActionMode.switchByActiveSelections(this._currentMode.id);
                    ActionMoveCursor.updatePreferedColumn();
                    this._currentMode.onDidChangeTextEditorSelection();
                }, 0);
            }),
            window.onDidChangeActiveTextEditor(() => {
                // Ensure correct selection after changing to new TextEditor
                setTimeout(() => {
                    if (Configuration.defaultModeID === ModeID.INSERT) {
                        ActionMode.toInsert();
                    }
                    else {
                        // Passing `null` to `currentMode` to force mode switch.
                        ActionMode.switchByActiveSelections(null);
                    }
                    ActionMoveCursor.updatePreferedColumn();
                }, 0);
            })
        );
    }

    private inputHandler(key: string, args: {} = {}): () => void {
        return () => {
            this._currentMode.input(key, args);
        };
    }

    private switchMode(id: ModeID): void {
        const lastMode = this._currentMode;

        if (lastMode) {
            lastMode.exit();
        }

        this._currentMode = this.modes[id];
        this._currentMode.enter();

        commands.executeCommand('setContext', 'amVim.mode', this._currentMode.name);

        // For use in repeat command
        if (lastMode) {
            this._currentMode.onDidRecordFinish(lastMode.recordedCommandMaps, lastMode.id);
        }
    }

    dispose(): void {
        Disposable.from(...this.disposables).dispose();

        Object.keys(this.modes).forEach(id => {
            (this.modes[id]).dispose();
        });
    }

}
