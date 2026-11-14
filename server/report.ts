import { z } from 'zod';
const counter=z.number().int().min(0).max(100000);
export const reportSchema=z.object({rows:counter,uniqueTimestamps:counter,duplicateRows:counter,missingTimestamps:z.array(z.string().max(40)).max(10000),outsideGrid:counter,finiteValues:counter,missingValues:counter,malformedValues:counter,negativeValues:counter,zeroValues:counter,physicalValidity:z.literal('not_assessed')}).strict();
