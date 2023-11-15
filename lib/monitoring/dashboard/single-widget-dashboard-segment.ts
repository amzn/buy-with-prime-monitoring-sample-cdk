import { IWidget } from 'aws-cdk-lib/aws-cloudwatch';
import { IDashboardSegment } from './i-dashboard-segment';

/**
 * This enables adding of a single dashboard segment to the existing dashboard.
 */

export class SingleWidgetDashboardSegment implements IDashboardSegment {
  private readonly widget: IWidget;

  constructor(widget: IWidget) {
      this.widget = widget;
  }

  buildWidgets(): IWidget[] {
      return [this.widget];
  }
}
