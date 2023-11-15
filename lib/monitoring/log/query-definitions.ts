import { CfnQueryDefinition } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface LogQueryDefinitionsProps {
    readonly applicationLogGroupName?: string,
    readonly serviceLogGroupName?: string,
    readonly customQueryDefinitions?: CfnQueryDefinition[],
}

export class LogQueryDefinitions {
    readonly queryDefinitions: CfnQueryDefinition[]

    constructor(scope: Construct, id: string, props: LogQueryDefinitionsProps) {
        this.queryDefinitions = [];

        if (props.applicationLogGroupName) {
            this.queryDefinitions.push(
                new CfnQueryDefinition(scope, `${id}AppLogErrors`, {
                    name: 'ApplicationLog.Errors',
                    queryString: `
                    fields @timestamp, @message, @logStream
                    | parse @message "[*] *" as loggingType, loggingMessage
                    | filter loggingType = "ERROR"
                    | sort @timestamp desc 
                    | limit 100
                    | display @logStream, loggingMessage`,
                    logGroupNames: [props.applicationLogGroupName],
                }),
            );
        }

        if (props.serviceLogGroupName) {
            this.queryDefinitions.push(
                new CfnQueryDefinition(scope, `${id}SerLogFaults`, {
                    name: 'ServiceLog.Faults',
                    queryString: `
                    fields @timestamp, @message
                    | filter Fault = 1
                    | sort @timestamp desc 
                    | limit 100`,
                    logGroupNames: [props.serviceLogGroupName],
                }),
            );
        }

        if (props.customQueryDefinitions) {
            this.queryDefinitions.push(...props.customQueryDefinitions);
        }
    }
}
