import { HeaderLevel, HeaderWidget } from './header-widget';

export interface MonitoringHeaderWidgetProps {
  /**
   * Title of the widget.
   */
  readonly title: string;
  /**
   * This enables consumers to add a URL to the dashboard.
   */
  readonly referenceUrl?: string;
}

/**
 * Extends the Header widget to add custom title and url to the header.
 */
export class LinkHeaderWidget extends HeaderWidget {
    constructor(props: MonitoringHeaderWidgetProps) {
        super(LinkHeaderWidget.buildText(props), HeaderLevel.LARGE);
    }

    // build the title text with the provided props.
    private static buildText(props: MonitoringHeaderWidgetProps): string {
        let { title } = props;

        if (props.referenceUrl) {
            title = `[${title}](${props.referenceUrl})`;
        }

        return title;
    }
}
