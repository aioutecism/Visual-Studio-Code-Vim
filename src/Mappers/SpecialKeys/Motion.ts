import {GenericMapper, GenericMap, RecursiveMap, MatchResultKind} from '../Generic';
import {SpecialKeyCommon, SpecialKeyMatchResult} from './Common';
import {SpecialKeyN} from './N';
import {SpecialKeyChar} from './Char';
import {Motion} from '../../Motions/Motion';
import {MotionCharacter} from '../../Motions/Character';
import {MotionDirection} from '../../Motions/Direction';
import {MotionWord} from '../../Motions/Word';
import {MotionMatch} from '../../Motions/Match';
import {MotionMatchPair} from '../../Motions/MatchPair';
import {MotionLine} from '../../Motions/Line';
import {MotionDocument} from '../../Motions/Document';
import {Configuration} from '../../Configuration';

interface MotionGenerator {
    (args?: {}): Motion;
}

interface MotionMap extends GenericMap {
    motionGenerators: MotionGenerator[];
}

export class SpecialKeyMotion extends GenericMapper implements SpecialKeyCommon {

    indicator = '{motion}';

    private conflictRegExp = /^[1-9]|\{N\}|\{char\}$/;

    private maps: MotionMap[] = [
        { keys: Configuration.getExtensionSetting<string>('leftKey'), motionGenerators: [MotionCharacter.left] },
        { keys: '{N} ' + Configuration.getExtensionSetting<string>('leftKey'), motionGenerators: [MotionCharacter.left] },
        { keys: 'left',      motionGenerators: [MotionCharacter.left] },
        { keys: '{N} left',  motionGenerators: [MotionCharacter.left] },
        { keys: Configuration.getExtensionSetting<string>('rightKey'), motionGenerators: [MotionCharacter.right] },
        { keys: '{N} ' + Configuration.getExtensionSetting<string>('rightKey'), motionGenerators: [MotionCharacter.right] },
        { keys: 'right',     motionGenerators: [MotionCharacter.right] },
        { keys: '{N} right', motionGenerators: [MotionCharacter.right] },
        { keys: Configuration.getExtensionSetting<string>('upKey'), motionGenerators: [MotionCharacter.up] },
        { keys: '{N} ' + Configuration.getExtensionSetting<string>('upKey'), motionGenerators: [MotionCharacter.up] },
        { keys: 'up',        motionGenerators: [MotionCharacter.up] },
        { keys: '{N} up',    motionGenerators: [MotionCharacter.up] },
        { keys: Configuration.getExtensionSetting<string>('downKey'), motionGenerators: [MotionCharacter.down] },
        { keys: '{N} ' + Configuration.getExtensionSetting<string>('downKey'), motionGenerators: [MotionCharacter.down] },
        { keys: 'down',      motionGenerators: [MotionCharacter.down] },
        { keys: '{N} down',  motionGenerators: [MotionCharacter.down] },

        { keys: 'w', motionGenerators: [MotionWord.nextStart] },
        { keys: '{N} w', motionGenerators: [MotionWord.nextStart] },
        { keys: 'W', motionGenerators: [MotionWord.nextStart], args: {useBlankSeparatedStyle: true} },
        { keys: '{N} W', motionGenerators: [MotionWord.nextStart], args: {useBlankSeparatedStyle: true} },
        { keys: 'e', motionGenerators: [MotionWord.nextEnd] },
        { keys: '{N} e', motionGenerators: [MotionWord.nextEnd] },
        { keys: 'E', motionGenerators: [MotionWord.nextEnd], args: {useBlankSeparatedStyle: true} },
        { keys: '{N} E', motionGenerators: [MotionWord.nextEnd], args: {useBlankSeparatedStyle: true} },
        { keys: 'b', motionGenerators: [MotionWord.prevStart] },
        { keys: '{N} b', motionGenerators: [MotionWord.prevStart] },
        { keys: 'B', motionGenerators: [MotionWord.prevStart], args: {useBlankSeparatedStyle: true} },
        { keys: '{N} B', motionGenerators: [MotionWord.prevStart], args: {useBlankSeparatedStyle: true} },

        { keys: 'f {char}', motionGenerators: [MotionMatch.next] },
        { keys: 'F {char}', motionGenerators: [MotionMatch.prev] },
        { keys: 't {char}', motionGenerators: [MotionMatch.next], args: {isTill: true} },
        { keys: 'T {char}', motionGenerators: [MotionMatch.prev], args: {isTill: true} },

        { keys: '%', motionGenerators: [MotionMatchPair.matchPair] },

        { keys: '^', motionGenerators: [MotionLine.firstNonBlank] },
        { keys: '0', motionGenerators: [MotionLine.start] },
        { keys: '$', motionGenerators: [MotionLine.end] },

        { keys: '-',     motionGenerators: [MotionCharacter.up, MotionLine.firstNonBlank] },
        { keys: '{N} -', motionGenerators: [MotionCharacter.up, MotionLine.firstNonBlank] },
        { keys: '+',     motionGenerators: [MotionCharacter.down, MotionLine.firstNonBlank] },
        { keys: '{N} +', motionGenerators: [MotionCharacter.down, MotionLine.firstNonBlank] },
        { keys: '_',     motionGenerators: [MotionLine.firstNonBlank] },
        { keys: '{N} _', motionGenerators: [
            (args: {n: number}) => MotionCharacter.down({ n: args.n - 1 }),
            MotionLine.firstNonBlank
        ] },

        { keys: 'g g',     motionGenerators: [MotionDocument.toLine, MotionLine.firstNonBlank], args: {n: 1} },
        { keys: '{N} g g', motionGenerators: [MotionDocument.toLine, MotionLine.firstNonBlank] },
        { keys: 'G',       motionGenerators: [MotionDocument.toLine, MotionLine.firstNonBlank], args: {n: +Infinity} },
        { keys: '{N} G',   motionGenerators: [MotionDocument.toLine, MotionLine.firstNonBlank] },

        { keys: 'space', motionGenerators: [MotionDirection.next] },
        { keys: '{N} space', motionGenerators: [MotionDirection.next] },
        { keys: 'backspace', motionGenerators: [MotionDirection.previous] },
        { keys: '{N} backspace', motionGenerators: [MotionDirection.previous] },
    ];

    constructor() {
        super([
            new SpecialKeyN(),
            new SpecialKeyChar(),
        ]);

        this.maps.forEach(map => {
            this.map(map.keys, map.motionGenerators, map.args);
        });
    }

    map(joinedKeys: string, motionGenerators: MotionGenerator[], args?: {}): void {
        const map = super.map(joinedKeys, args);
        (map as MotionMap).motionGenerators = motionGenerators;
    }

    unmapConflicts(node: RecursiveMap, keyToMap: string): void {
        if (keyToMap === this.indicator) {
            Object.getOwnPropertyNames(node).forEach(key => {
                this.conflictRegExp.test(key) && delete node[key];
            });
        }

        if (this.conflictRegExp.test(keyToMap)) {
            delete node[this.indicator];
        }

        // This class has lower priority than other keys.
    }

    matchSpecial(inputs: string[]): SpecialKeyMatchResult | null {
        const {kind, map} = this.match(inputs);

        if (kind === MatchResultKind.FAILED) {
            return null;
        }

        let additionalArgs: {motions?: Motion[]} = {};
        if (map) {
            additionalArgs.motions = (map as MotionMap).motionGenerators.map(generator => generator(map.args));
        }

        return {
            specialKey: this,
            kind,
            matchedCount: inputs.length,
            additionalArgs
        };
    }

}
