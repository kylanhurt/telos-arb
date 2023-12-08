#! /bin/bash

#contract
if [[ "$1" == "arbitration" ]]; then
    contract=arbitration
else
    echo "need contract"
    exit 0
fi

echo ">>> Testing $contract contract..."

#copy build to tests folder
# cp build/arbitration/arbitration.wasm tests/contracts/arbitration/
# cp build/arbitration/arbitration.abi tests/contracts/arbitration/

#start nodeos
eoslime nodeos start

#run test suite
mocha tests/arbitrationTests.js

#stop nodeos
eoslime nodeos stop
