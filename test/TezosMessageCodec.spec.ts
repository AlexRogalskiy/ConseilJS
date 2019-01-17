import { expect } from "chai";
import { TezosMessageCodec } from "../src/tezos/TezosMessageCodec";
import "mocha";

describe("Tezos P2P message decoder test suite", () => {
  it("correctly parse a transaction", () => {
    let forgedTransaction = "9cd3aa823667cd8223073d2447c4c012373c99a00df5112b502ee82f5cf95ae408000069ef8fb5d47d8a4321c94576a2316a632be8ce898094ebdc039cfe19bc50ac0280a0c21e00004783ca75ac8736021036aa5ff2a69f116eca759800";
    const result = TezosMessageCodec.parseTransaction(forgedTransaction);
    expect(result.operation.kind).to.equal("transaction");
    expect(result.operation.source).to.equal("tz1VJAdH2HRUZWfohXW59NPYQKFMe1csroaX");
    expect(result.operation.destination).to.equal("tz1SAAYjCwU5TGHZkigrG8iFSm3uhN2hHzfp");
    expect(result.operation.amount).to.equal('64000000'); // microtez
    expect(result.operation.fee).to.equal('1000000000'); // microtez
    expect(result.operation.gas_limit).to.equal('10300'); // microtez
    expect(result.operation.storage_limit).to.equal('300'); // microtez
  });

  it("correctly parse a reveal", () => {
    let forgedReveal = "97648f6470b21f904cb8d11eaf097f245eb42f5073fa51404d969cdfd4a4579e07000069ef8fb5d47d8a4321c94576a2316a632be8ce890094fe19904e00004c7b0501f6ea08f472b7e88791d3b8da49d64ac1e2c90f93c27e6531473305c6";
    const result = TezosMessageCodec.parseReveal(forgedReveal);
    expect(result.operation.kind).to.equal("reveal");
    expect(result.operation.source).to.equal("tz1VJAdH2HRUZWfohXW59NPYQKFMe1csroaX");
    expect(result.operation.fee).to.equal('0'); // microtez
    expect(result.operation.gas_limit).to.equal('10000'); // microtez
    expect(result.operation.storage_limit).to.equal('0'); // microtez
  });

  it("correctly parse a reveal/transaction operation group", () => {
    let forgedGroup = "1135aca1d87caaef7c996554329f9f50971cb21e1c5f7c5fd7b961c3d6b837a80701b4dd7343459d2be37bd5b178aed42d10d2bcaaa6000001904e0000fc3e2803c22138160355e116671fae2d6129aea448852e45bbce1afcd95a7b480801b4dd7343459d2be37bd5b178aed42d10d2bcaaa600a0c21e02bc50ac02c096b10200004e1808fc58ea7383c7493400aaaa9a2b2592536d00";
    const result = TezosMessageCodec.parseOperationGroup(forgedGroup);

    expect(result[0].kind).to.equal("reveal");
    expect(result[0].source).to.equal("KT1R56UvkvU9NCnviU15bWUoyaq5nhEu7zEs");
    expect(result[0].fee).to.equal('0'); // microtez
    expect(result[0].gas_limit).to.equal('10000'); // microtez
    expect(result[0].storage_limit).to.equal('0'); // microtez
    expect(result[0].counter).to.equal('1');

    expect(result[1].kind).to.equal("transaction");
    expect(result[1].source).to.equal("KT1R56UvkvU9NCnviU15bWUoyaq5nhEu7zEs");
    expect(result[1].destination).to.equal("tz1SkxC51pdLhugeBmix57xsPcfDqAMgaTF8");
    expect(result[1].amount).to.equal("5000000"); // microtez
    expect(result[1].fee).to.equal('500000'); // microtez
    expect(result[1].gas_limit).to.equal('10300'); // microtez
    expect(result[1].storage_limit).to.equal('300'); // microtez
    expect(result[1].counter).to.equal('2');
  });

  it("correctly parse an origination", () => {
    let forgedOrigination = "30d0f6eceb58ee25a7477b8f6baa6dec852c038fb550a8c4a0f9016f4543f6c7090000b2e1d673031ec0711eacb822cbca4ce95f1e3c0a80897a8a05b04f950200b2e1d673031ec0711eacb822cbca4ce95f1e3c0a80dac409ffffff00641d2f258a7fafe9cf1f18720a14dfadba9adb0e00bf7366f8a48e82b025c898ba8eb7c333f1c720ccab3df932409c283b42c272e0b9cce73a4c657e0b9901726c8436fc2c177ba06f712dfd35320f67ee4b4dcf04";
    const result = TezosMessageCodec.parseOrigination(forgedOrigination);
    expect(result.operation.kind).to.equal("origination");
    expect(result.operation.source).to.equal("tz1bwsWk3boyGgXf3u7CJGZSTfe14djdRtxG");
    expect(result.operation.managerPubkey).to.equal("tz1bwsWk3boyGgXf3u7CJGZSTfe14djdRtxG");
    expect(result.operation.balance).to.equal('20000000'); // microtez
    expect(result.operation.spendable).to.equal(true);
    expect(result.operation.delegatable).to.equal(true);
    expect(result.operation.delegate).to.equal("tz1UmPE44pqWrEgW8sTRs6ED1DgwF7k43ncQ");
    expect(result.operation.fee).to.equal('2000000'); // microtez
    expect(result.operation.gas_limit).to.equal('10160'); // microtez
    expect(result.operation.storage_limit).to.equal('277'); // microtez
    expect(result.operation.counter).to.equal('650');
  });

  it("correctly parse an origination with contract", () => {
    let forgedOrigination = "0f9c939d51f90e9435fe2f466058eed68cd7f0624ff439136dfe2dcc3139391c090000b2e1d673031ec0711eacb822cbca4ce95f1e3c0ac09a0c890581d901b04f00b2e1d673031ec0711eacb822cbca4ce95f1e3c0a80897affffff00641d2f258a7fafe9cf1f18720a14dfadba9adb0eff0000001c02000000170500036805010368050202000000080316053d036d03420000000a010000000568656c6c6f15f3cff9210c5287e91a2a9ba65871ed83b7c784ecf42419aa03c7bef02e50cd7916e228f15418ca74b7bb12d42f64cd9dac7e978173ff1360ff4dc7ca7bb501";
    const result = TezosMessageCodec.parseOrigination(forgedOrigination);
    expect(result.operation.kind).to.equal("origination");
    expect(result.operation.source).to.equal("tz1bwsWk3boyGgXf3u7CJGZSTfe14djdRtxG");
    expect(result.operation.managerPubkey).to.equal("tz1bwsWk3boyGgXf3u7CJGZSTfe14djdRtxG");
    //script
    expect(result.operation.balance).to.equal('2000000'); // microtez
    expect(result.operation.spendable).to.equal(true);
    expect(result.operation.delegatable).to.equal(true);
    expect(result.operation.delegate).to.equal("tz1UmPE44pqWrEgW8sTRs6ED1DgwF7k43ncQ");
    expect(result.operation.fee).to.equal('200000'); // microtez
    expect(result.operation.gas_limit).to.equal('27777'); // microtez
    expect(result.operation.storage_limit).to.equal('10160'); // microtez
    expect(result.operation.counter).to.equal('649');
  });

  it("correctly parse a delegation ", () => {
    let forgedDelegtion = "a76af8bde55501f677bfff412d59dd21a91606f47459288476a6e947766d0e8c0a0180be2031715ea183848c08e2ff59d62e7d255ae500a0c21e03904e00ff00b15b7a2484464ed3228c0ae23d0391f8269de3da";
    const result = TezosMessageCodec.parseDelegation(forgedDelegtion);
    expect(result.operation.kind).to.equal("delegation");
    expect(result.operation.source).to.equal("KT1LKVpVJGP2Rfg4GznEJLcDEoetibs93GvM");
    expect(result.operation.delegate).to.equal("tz1boot1pK9h2BVGXdyvfQSv8kd1LQM6H889");
    expect(result.operation.fee).to.equal('500000'); // microtez
    expect(result.operation.gas_limit).to.equal('10000'); // microtez
    expect(result.operation.storage_limit).to.equal('0'); // microtez
    expect(result.operation.counter).to.equal('3');
  });

  it("correctly parse a reveal/delegation OperationGroup", () => {
    let forgedGroup = "9ceeeb1b01045aa2231e2f025a8bf3dc8ea191c53efacdee3cd639450e47890a070127e038a44406b1d0a61a37e1cba18bc37a3f33a0000001904e0000fc3e2803c22138160355e116671fae2d6129aea448852e45bbce1afcd95a7b480a0127e038a44406b1d0a61a37e1cba18bc37a3f33a000a0c21e02904e00ff00c2cd1f0ce9de3c729b4d83156c69f67f5a907d28";
    const result = TezosMessageCodec.parseOperationGroup(forgedGroup);

    expect(result[0].kind).to.equal("reveal");
    expect(result[0].source).to.equal("KT1CDcXQtxjfvrsCbD4mTp97ve5TawS8f8wb");
    expect(result[0].fee).to.equal('0'); // microtez
    expect(result[0].gas_limit).to.equal('10000'); // microtez
    expect(result[0].storage_limit).to.equal('0'); // microtez
    expect(result[0].counter).to.equal('1');

    expect(result[1].kind).to.equal("delegation");
    expect(result[1].source).to.equal("KT1CDcXQtxjfvrsCbD4mTp97ve5TawS8f8wb");
    expect(result[1].delegate).to.equal("tz1dQ3WQpKTu1Vi3ZF6DwaZRgdEVS28RNw2h");
    expect(result[1].fee).to.equal('500000'); // microtez
    expect(result[1].gas_limit).to.equal('10000'); // microtez
    expect(result[1].storage_limit).to.equal('0'); // microtez
    expect(result[1].counter).to.equal('2');
  });
});