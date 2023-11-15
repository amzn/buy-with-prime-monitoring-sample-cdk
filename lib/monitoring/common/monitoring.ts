import { IWidget } from 'aws-cdk-lib/aws-cloudwatch';
import { IDashboardSegment } from '../dashboard';
import { MonitoringFacade } from '../resources';

/**
 * Base abstract class that takes in the exposed Facade and provides widgets and alarm fetching capabilities.
 */

export abstract class Monitoring implements IDashboardSegment {
  readonly facade: MonitoringFacade;

  protected constructor(facade: MonitoringFacade) {
      this.facade = facade;
  }

  buildMetricFactory() {
      return this.facade.buildMetricFactory();
  }

  abstract buildWidgets(): IWidget[];
}
