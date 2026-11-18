// Unbloxed classic clothing: Roblox-style 2D shirt / pants templates (585x559 layout; smaller files are the same layout scaled down).
// Images live in unbloxed/clothing/. Load this before unbloxed/avatar.js: makeChar paints a.shirt / a.pants (1-based, 0 = none) from these lists.
// Shirts cover the torso + both arms, pants cover the legs. Where a template is transparent the body colour shows.
const UBX_CLOTH_DIR=((document.currentScript&&document.currentScript.src)||'unbloxed/clothing.js').replace(/[^\/]*$/,'')+'clothing/';
// a copy of the site opened from a folder (file://) can't paint plain image files onto WebGL textures: there the same images come as data URIs
if(location.protocol==='file:')document.write('<script src="'+UBX_CLOTH_DIR.replace(/clothing\/$/,'clothing-data.js')+'"><\/script>');
const UBX_SHIRTS=[
 {nm:'Dark Vest & Red Tie',file:'dark-vest-red-tie.png',pr:150},
 {nm:'Tactical Vest',file:'tactical-vest.png',pr:200},
 {nm:'Red Sports Tee',file:'red-sports-tee.png',pr:100},
 {nm:'Iron Armor Shirt',file:'iron-armor-shirt.png',pr:250},
 {nm:'Black Suit',file:'black-suit.png',pr:200},
 {nm:'Black Hoodie',file:'black-hoodie.png',pr:125}];
const UBX_PANTS=[
 {nm:'Web Hero Pants',file:'web-hero-pants.png',pr:150}];
