import {window} from 'vscode';
import {StaticReflect} from '../LanguageExtensions/StaticReflect';
import {SymbolMetadata} from '../Symbols/Metadata';
import {MatchResultKind} from '../Mappers/Generic';
import {CommandMap, CommandMapper} from '../Mappers/Command';

export enum ModeID {NORMAL, VISUAL, VISUAL_LINE, INSERT};
export const ModeIDConfig = {
    normal: ModeID.NORMAL,
    insert: ModeID.INSERT,
    visual: ModeID.VISUAL,
    visual_line: ModeID.VISUAL_LINE
};

export abstract class Mode {

    id: ModeID;
    name: string;

    private pendings: CommandMap[] = [];
    private executing: boolean = false;
    private inputs: string[] = [];

    protected mapper: CommandMapper = new CommandMapper();

    enter(): void {
        this.updateStatusBar();
    }

    private updateStatusBar(message?: string): void {
        let status = `-- ${this.name} --`;

        if (message) {
            status += ` ${message}`;
        }

        window.setStatusBarMessage(status);
    }

    exit(): void {
        this.clearInputs();
        this.clearPendings();
    }

    dispose(): void {
        this.exit();
    }

    private clearInputs(): void {
        this.inputs = [];
    }

    private clearPendings(): void {
        this.pendings = [];
    }

    input(key: string, args: {} = {}): MatchResultKind {
        let inputs: string[];

        if (key === 'escape') {
            inputs = [key];
        }
        else {
            this.inputs.push(key);
            inputs = this.inputs;
        }

        const {kind, map} = this.mapper.match(inputs);

        if (kind === MatchResultKind.FAILED) {
            this.updateStatusBar();
            this.clearInputs();
        }
        else if (kind === MatchResultKind.FOUND) {
            this.updateStatusBar();
            this.clearInputs();
            this.pushCommandMap(map!);
            this.execute();
        }
        else if (kind === MatchResultKind.WAITING) {
            this.updateStatusBar(`${this.inputs.join(' ')} and...`);
        }

        return kind;
    }

    protected pushCommandMap(map: CommandMap): void {
        this.pendings.push(map);
    }

    /**
     * Override this to return recorded command maps.
     */
    get recordedCommandMaps(): CommandMap[] { return []; }

    /**
     * Override this to do something before command map makes changes.
     */
    protected onWillCommandMapMakesChanges(map: CommandMap): void {}

    /**
     * Override this to do something after recording ends.
     */
    onDidRecordFinish(recordedCommandMaps: CommandMap[], previousModeID: ModeID): void {}

    protected execute(): void {
        if (this.executing) {
            return;
        }

        this.executing = true;

        const one = () => {
            const map = this.pendings.shift();

            if (! map) {
                this.executing = false;
                return;
            }

            const isAnyActionIsChange = map.actions.some(action => {
                return StaticReflect.getMetadata(SymbolMetadata.Action.isChange, action);
            });
            if (isAnyActionIsChange) {
                this.onWillCommandMapMakesChanges(map);
            }

            let promise = Promise.resolve(true);

            map.actions.forEach(action => {
                promise = promise.then(() => action(map.args));
            });

            promise.then(
                one.bind(this),
                () => {
                    this.clearPendings();
                    this.executing = false;
                }
            );
        };

        one();
    }

}
