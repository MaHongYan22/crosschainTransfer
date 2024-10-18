import json
 
# NFT的元数据
nft_metadata = {
    "name": "MHY",
    "description": "This is an example NFT.",
    "image": "ipfs://QmWY238XrRqUXjRo63PpkAvq22CLj1w5hyxCHZHRnBmEazpython",
    "attributes": [
        {
            "trait_type": "Background",
            "value": "Green"
        },
        {
            "trait_type": "Eyes",
            "value": "Smiling"
        }
    ]
}
 
# 将字典转换成JSON字符串
json_string = json.dumps(nft_metadata, indent=4)
 
# 将JSON字符串写入文件
with open('nft_metadata.json', 'w') as file:
    file.write(json_string)