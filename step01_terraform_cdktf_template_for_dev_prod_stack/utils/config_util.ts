import { resolve } from 'path';
import { readFileSync } from 'fs';
import * as yaml from 'yaml';
import { merge } from 'lodash';
import { Config } from '../types/types';

export function loadConfig(stage:Config['stage']):Config{
  // Load common file
  let commonConfig = {};
  try {
    // commonConfig = yaml.parseDocument(resolve(__dirname, '../config/common.yaml'))
    commonConfig = yaml.parse(
      readFileSync(resolve(__dirname, '../config/common.yaml'), 'utf8'),
    );
  } catch (err) {
    console.log('No config found in config/common.yaml.');
  }
  console.log("commonConfig==>",commonConfig);

  // Load stage specific file
  let envConfig = {};
  try {
    envConfig = yaml.parse(
      readFileSync(resolve(__dirname, `../config/${stage}.yaml`), 'utf8'),
    );
  } catch (err) {
    console.log(`No config found in config/${stage}.yaml`);
  }

  console.log("envConfig===>",envConfig);

  // Merge the configs
  const mergedConfig = merge({}, commonConfig, envConfig) as Config;;
  // Extract stage to set env
    mergedConfig['stage'] = stage;
 // mergedConfig['ssm_infra'] = `/clubsoul/infra/${stage}/`;

  console.log(mergedConfig);

  return mergedConfig;
}