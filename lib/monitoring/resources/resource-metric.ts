/**
 * Base interface for all the resources to extend for specifying common attributes in their dashboard segment.
 */
export interface ResourceMetricProps {
  /**
   * Title of the segment for a given resource that needs to be monitored.
   */
  readonly title: string;

  /**
   * Set to true when running in a developer AWS account.
   *
   * @default false
   */
  readonly isDev?: boolean;
}