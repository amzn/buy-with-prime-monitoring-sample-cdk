import { CfnInsightRule } from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { FireLensSidecar } from '../../ecs/firelens'

export interface ContributorInsightProps extends cdk.StackProps {
    firelensSidercar: FireLensSidecar;
    env: object;
}

export class ContributorInsight extends cdk.Stack {
    constructor(scope: Construct, id: string, props: ContributorInsightProps) {
        super(scope, id, props);

        new JsonInsightRule(this, {
            ruleName: 'top-callers',
            logGroupNames: [
                props.firelensSidercar.emfLogGroup.logGroupName,
            ],
            contribution: {
                Keys: [
                    '$.User',
                ],
                Filters: [],
            },
        });

        new JsonInsightRule(this, {
            ruleName: 'top-callers-with-client-errors',
            logGroupNames: [
                props.firelensSidercar.emfLogGroup.logGroupName,
            ],
            contribution: {
                Keys: [
                    '$.User',
                ],
                Filters: [
                    {
                        Match: '$.Error',
                        EqualTo: 1,
                    },
                ],
            },
        });

        new JsonInsightRule(this, {
            ruleName: 'top-callers-with-server-errors',
            logGroupNames: [
                props.firelensSidercar.emfLogGroup.logGroupName,
            ],
            contribution: {
                Keys: [
                    '$.User',
                ],
                Filters: [
                    {
                        Match: '$.Fault',
                        EqualTo: 1,
                    },
                ],
            },
        });

        new JsonInsightRule(this, {
            ruleName: 'top-callers-per-api',
            logGroupNames: [
                props.firelensSidercar.emfLogGroup.logGroupName,
            ],
            contribution: {
                Keys: [
                    '$.User',
                    '$.Operation',
                ],
                Filters: [],
            },
        });

        new JsonInsightRule(this, {
            ruleName: 'top-callers-with-client-errors-per-api',
            logGroupNames: [
                props.firelensSidercar.emfLogGroup.logGroupName,
            ],
            contribution: {
                Keys: [
                    '$.User',
                    '$.Operation',
                ],
                Filters: [
                    {
                        Match: '$.Error',
                        EqualTo: 1,
                    },
                ],
            },
        });

        new JsonInsightRule(this, {
            ruleName: 'top-callers-with-server-errors-per-api',
            logGroupNames: [
                props.firelensSidercar.emfLogGroup.logGroupName,
            ],
            contribution: {
                Keys: [
                    '$.User',
                    '$.Operation',
                ],
                Filters: [
                    {
                        Match: '$.Fault',
                        EqualTo: 1,
                    },
                ],
            },
        });
    }
}

interface JsonInsightRuleProps {
  readonly ruleName: string;
  readonly logGroupNames: string[];
  /**
   * See https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContributorInsights-RuleSyntax.html
   * for syntax and limits.
   */
  readonly contribution: { [key: string]: any };
  /**
   * @default Count
   */
  readonly aggregateOn?: 'Sum' | 'Count';
}

class JsonInsightRule extends Construct {
  readonly insightRuleMetric: (metricName: string) => string;

  constructor(scope: Construct, props: JsonInsightRuleProps) {
      super(scope, `json-insight-rule-${props.ruleName.toLowerCase()}`);

      new CfnInsightRule(this, `insight-rule-${props.ruleName.toLowerCase()}`, {
          ruleName: props.ruleName,
          ruleState: 'ENABLED',
          ruleBody: JSON.stringify({
              Schema: {
                  Name: 'CloudWatchLogRule',
                  Version: 1,
              },
              LogGroupNames: props.logGroupNames,
              LogFormat: 'JSON',
              Contribution: props.contribution,
              AggregateOn: props.aggregateOn ?? 'Count',
          }),
      });

      this.insightRuleMetric = (metricName: string) => `INSIGHT_RULE_METRIC(${props.ruleName}, ${metricName})`;
  }
}
