#!/bin/sh
echo "entrypoint: $1";
echo "function: $2";

ENTRY_POINT=$1;
FUNCTION_NAME=$2;
FUNCTION_PATH="functions/$FUNCTION_NAME";
echo "$FUNCTION_PATH"

## BUILD 
FUNCTION_PACKAGE_NAME=$(cat "./$FUNCTION_PATH/package.json" \
    | grep "name" \
    | awk '{split($0, splitPackageName, ":"); split(splitPackageName[2], packageNameSplitByQuote, "\""); print packageNameSplitByQuote[2];}')

echo "Function name: $FUNCTION_PACKAGE_NAME";

yarn workspace $FUNCTION_PACKAGE_NAME install

yarn workspace $FUNCTION_PACKAGE_NAME build


## UPDATE module alias

PACKAGES_PATHS=$(cat "./$FUNCTION_PATH/tsconfig.json" | grep "\@lukastech");

UPDATED_PATHS=$(echo $PACKAGES_PATHS | sed -e 's/\[/path.join\(__dirname, /g' | sed -e 's/\],*/\),\\n\\t/g')

OUTPUT_MODULE_ALIAS="./$FUNCTION_PATH/dist/index.js";
echo "OUTPUT: $OUTPUT_MODULE_ALIAS"
echo "const path = require('path');\n\
const moduleAlias = require('module-alias');\n
moduleAlias.addAliases({ \n\t\t$UPDATED_PATHS}); \n
module.exports = require('./functions/$2/src/index');
" > $OUTPUT_MODULE_ALIAS;

## deploy

DEPLOY_CMD="\
gcloud functions deploy $FUNCTION_NAME \
    --source $FUNCTION_PATH \
    --runtime nodejs20 \
    --trigger-http \
    --entry-point $ENTRY_POINT"

echo "DEPLOY cmd: $DEPLOY_CMD"

$($DEPLOY_CMD)



