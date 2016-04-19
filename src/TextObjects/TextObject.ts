import {window, TextDocument, Position, Range} from 'vscode';

export enum TextObjectSearchingRange {Document, Line};

export abstract class TextObject {

    protected isInclusive: boolean;

    /**
     * Override this to return start position of text object or null if not found.
     */
    protected findStartRange(document:TextDocument, anchor: Position): Range {
        throw new Error('findStartPosition is not implemented.');
    }

    /**
     * Override this to return end position of text object or null if not found.
     */
    protected findEndRange(document:TextDocument, anchor: Position): Range {
        throw new Error('findEndPosition is not implemented.');
    }

    apply(anchor: Position): Range {
        if (this.isInclusive === undefined) {
            throw new Error('isInclusive is not set.');
        }

        const activeTextEditor = window.activeTextEditor;

        if (! activeTextEditor) {
            return null;
        }

        const document = activeTextEditor.document;

        const startRange = this.findStartRange(document, anchor);
        if (startRange === null) {
            return null;
        }

        const endRange = this.findEndRange(document, anchor);
        if (endRange === null) {
            return null;
        }

        return this.isInclusive
            ? new Range(startRange.start, endRange.end)
            : new Range(startRange.end, endRange.start);
    }

}