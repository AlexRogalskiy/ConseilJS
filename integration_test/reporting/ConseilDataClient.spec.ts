import 'mocha';
import {expect} from 'chai';
import fetch from 'node-fetch';

import FetchSelector from '../../src/utils/FetchSelector';
FetchSelector.setFetch(fetch);

import {ConseilQueryBuilder} from "../../src/reporting/ConseilQueryBuilder";
import {ConseilOperator, ConseilSortDirection, ConseilOutput} from "../../src/types/conseil/QueryTypes"
import {ConseilDataClient} from '../../src/reporting/ConseilDataClient'
import {servers} from "../servers";

const ConseilV2URL = servers.conseilServer;
const ConseilV2APIKey = servers.conseilApiKey;

describe('ConseilDataClient integration test suite', () => {
    it('Extract result set as csv', async () => {
        let query = ConseilQueryBuilder.blankQuery();
        query = ConseilQueryBuilder.addPredicate(query, 'kind', ConseilOperator.EQ, ['transaction'], false);
        query = ConseilQueryBuilder.addOrdering(query, 'block_level', ConseilSortDirection.DESC);
        query = ConseilQueryBuilder.setLimit(query, 5);
        query = ConseilQueryBuilder.setOutputType(query, ConseilOutput.csv);
        const result = await ConseilDataClient.executeEntityQuery({ url: ConseilV2URL, apiKey: ConseilV2APIKey }, 'tezos', 'alphanet', 'operations', query);

        expect(result.length).to.be.greaterThan(100);
        expect(result.length).to.be.a.instanceof(String);
    });
});
