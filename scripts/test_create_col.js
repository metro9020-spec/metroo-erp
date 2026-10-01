// Native fetch is global in Node 24
async function run() {
  const res = await globalThis.fetch("https://sgp.cloud.appwrite.io/v1/databases/metro_erp_db/collections", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": "6abbaed6002fd9bf3d58",
      "X-Appwrite-Key": "standard_7838a375517b76a8c4ffaa61761767194ce2b223926bfd2b03d35b9fedb025813bdff2d32a5379356d40edd54b11db36010cd602d546953cca65de4a86ac7692b63d47a6ad3b3b63d25807e9e24dc583d0d986726b7af770907a1dad97929892a4fcfb12c5b62d2bdc416c2c94e198abe7574b35bec6dbdbac1098e0c1a84236"
    },
    body: JSON.stringify({
      collectionId: "test_col",
      name: "Test Collection",
      permissions: ['read("any")', 'create("any")']
    })
  });
  console.log("Status:", res.status);
  const data = await res.text();
  console.log("Body:", data);
}
run();
