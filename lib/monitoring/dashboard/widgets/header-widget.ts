import { TextWidget } from 'aws-cdk-lib/aws-cloudwatch';
import { FULL_WIDTH } from '../../common/widgets';

export enum HeaderLevel {
  LARGE = 0,
  MEDIUM = 1,
  SMALL = 2
}

/**
 * Header widget appears as the top section in a group of widgets.
 */
export class HeaderWidget extends TextWidget {
    constructor(text: string, level?: HeaderLevel) {
        super({
            width: FULL_WIDTH,
            height: 1,
            markdown: HeaderWidget.toMarkdown(text, level ?? HeaderLevel.LARGE),
        });
    }

    // Converts the given string to markdown format.
    private static toMarkdown(text: string, level: HeaderLevel) {
        return `${'#'.repeat(level + 1)} ${text}`;
    }
}
