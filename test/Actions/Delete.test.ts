import * as assert from 'assert';
import * as TestUtil from '../Util';
import {window, Selection} from 'vscode';

import {Configuration} from '../../src/Configuration';
import {ActionDelete} from '../../src/Actions/Delete';
import {MotionWord} from '../../src/Motions/Word';

export function run() {

    Configuration.init();

    test('ActionDelete.byMotions', (done) => {

        const testCases = [
            {
                message: 'MotionWord.nextStart at line end',
                motions: [MotionWord.nextStart()],
                in: 'Foo end\nBar end',
                selection: new Selection(0, 6, 0, 6),
                out: 'Foo en\nBar end',
            },
            {
                message: 'MotionWord.prevStart at line start',
                motions: [MotionWord.prevStart()],
                in: 'Foo end\nBar end',
                selection: new Selection(1, 0, 1, 0),
                out: 'Foo end\nBar end',
            }
        ];

        let promise = Promise.resolve();

        while (testCases.length > 0) {
            const testCase = testCases.shift();
            promise = promise.then(() => {

                return TestUtil.createTempDocument(testCase.in).then(() => {
                    TestUtil.setSelection(testCase.selection);

                    return ActionDelete.byMotions({
                        motions: testCase.motions
                    }).then(() => {
                        assert.equal(TestUtil.getDocument().getText(), testCase.out, testCase.message);
                    });
                });

            });
        }

        promise.then(() => {
            done();
        }, (error) => {
            done(error);
        });

    });
};
