import {window, Position, Range} from 'vscode';
import {StaticReflect} from '../LanguageExtensions/StaticReflect';
import {SymbolMetadata} from '../Symbols/Metadata';
import {ActionMoveCursor} from './MoveCursor';
import {ActionSelection} from './Selection';
import {Motion} from '../Motions/Motion';
import {MotionCharacter} from '../Motions/Character';
import {MotionLine} from '../Motions/Line';
import {TextObject} from '../TextObjects/TextObject';
import {UtilRange} from '../Utils/Range';

export class ActionRegister {

    private static stash: string = '';

    static GetStash(): string {
        return ActionRegister.stash;
    }

    static SetStash(one: string): void;
    static SetStash(list: string[]): void;
    static SetStash(input: string | string[]): void {
        if (typeof input === 'string') {
            ActionRegister.stash = input;
        }
        else {
            ActionRegister.stash = input.join('');
        }
    }

    static yankRanges(ranges: Range[]): Thenable<boolean> {
        const activeTextEditor = window.activeTextEditor;

        if (! activeTextEditor) {
            return Promise.resolve(false);
        }

        const document = activeTextEditor.document;

        ActionRegister.stash = ranges.map(range => {
            return document.getText(document.validateRange(range));
        }).join('');

        return Promise.resolve(true);
    }

    static yankByMotions(args: {motions: Motion[]}): Thenable<boolean> {
        const activeTextEditor = window.activeTextEditor;

        if (! activeTextEditor) {
            return Promise.resolve(false);
        }

        const document = activeTextEditor.document;

        let ranges = activeTextEditor.selections.map(selection => {
            const start = selection.active;
            const end = args.motions.reduce((position, motion) => {
                return motion.apply(position, {
                    isInclusive: true,
                    shouldCrossLines: false,
                });
            }, start);
            return new Range(start, end);
        });

        if (args.motions.some(motion => motion.isLinewise)) {
            ranges = ranges.map(range => UtilRange.toLinewise(range, document));
        }

        ranges = UtilRange.unionOverlaps(ranges);

        return ActionRegister.yankRanges(ranges);
    }

    static yankByTextObject(args: {textObject: TextObject}): Thenable<boolean> {
        const activeTextEditor = window.activeTextEditor;

        if (! activeTextEditor) {
            return Promise.resolve(false);
        }

        let ranges: Range[] = [];

        activeTextEditor.selections.forEach(selection => {
            const match = args.textObject.apply(selection.active);
            if (match) {
                ranges.push(match);
            }
        });

        ranges = UtilRange.unionOverlaps(ranges);

        return ActionRegister.yankRanges(ranges);
    }

    static yankSelections(): Thenable<boolean> {
        const activeTextEditor = window.activeTextEditor;

        if (! activeTextEditor) {
            return Promise.resolve(false);
        }

        return ActionRegister.yankRanges(activeTextEditor.selections);
    }

    static yankLines(): Thenable<boolean> {
        const activeTextEditor = window.activeTextEditor;

        if (! activeTextEditor) {
            return Promise.resolve(false);
        }

        const document = activeTextEditor.document;

        let ranges = activeTextEditor.selections.map(selection => UtilRange.toLinewise(selection, document));

        ranges = UtilRange.unionOverlaps(ranges);

        return ActionRegister.yankRanges(ranges);
    }

    @StaticReflect.metadata(SymbolMetadata.Action.isChange, true)
    static putAfter(): Thenable<boolean> {
        const activeTextEditor = window.activeTextEditor;

        if (! activeTextEditor) {
            return Promise.resolve(false);
        }

        const characters = ActionRegister.stash.length;
        const lines = ActionRegister.stash.split(/\n/).length;

        const putPositions = activeTextEditor.selections.map(selection => {
            return lines === 1
                ? selection.active.translate(0, +1)
                : new Position(selection.active.line + 1, 0);
        });

        return ActionSelection.shrinkToActives()
            .then(() => {
                return activeTextEditor.edit((editBuilder) => {
                    putPositions.forEach(position => {
                        editBuilder.insert(position, ActionRegister.stash);
                    });
                });
            })
            .then(() => {
                if (lines === 1) {
                    return ActionMoveCursor.byMotions({motions: [
                        MotionCharacter.right({n: characters}),
                    ]});
                }
                else {
                    return ActionMoveCursor.byMotions({motions: [
                        MotionCharacter.down({n: lines - 1}),
                        MotionLine.firstNonBlank(),
                    ]});
                }
            });
    }

    @StaticReflect.metadata(SymbolMetadata.Action.isChange, true)
    static putBefore(): Thenable<boolean> {
        const activeTextEditor = window.activeTextEditor;

        if (! activeTextEditor) {
            return Promise.resolve(false);
        }

        const lines = ActionRegister.stash.split(/\n/).length;

        const putPositions = activeTextEditor.selections.map(selection => {
            return lines === 1
                ? selection.active
                : selection.active.with(undefined, 0);
        });

        return ActionSelection.shrinkToActives()
            .then(() => {
                return activeTextEditor.edit((editBuilder) => {
                    putPositions.forEach(position => {
                        editBuilder.insert(position, ActionRegister.stash);
                    });
                });
            })
            .then(() => {
                if (lines === 1) {
                    return ActionMoveCursor.byMotions({motions: [
                        MotionCharacter.left(),
                    ]});
                }
                else {
                    return ActionMoveCursor.byMotions({motions: [
                        MotionCharacter.up(),
                        MotionLine.firstNonBlank(),
                    ]});
                }
            });
    }

};
