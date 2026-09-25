// src/utils/itemGenerator.js

const ITEM_TYPES = ["Boots", "Gloves", "Lamp", "Pickaxe", "Vest"];
const RARITIES = ["Common", "Rare", "Epic", "Legendary"];
const ITEM_IMAGE_BASE_URL = "https://storage.yandexcloud.net/gamegems";

export function getItemImageUrl(itemType, rarity) {
  const fileName = itemType === "Vest" && rarity === "Legendary"
    ? "legndary.jpg"
    : `${rarity.toLowerCase()}.jpg`;

  return `${ITEM_IMAGE_BASE_URL}/${itemType.toLowerCase()}/${fileName}`;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRarity(bootsMod = 0) {
  let baseRand = Math.floor(Math.random() * 100);
  baseRand += bootsMod; // увеличиваем шанс выпадения редкости

  if (baseRand >= 98) return "Legendary";
  if (baseRand >= 90) return "Epic";
  if (baseRand >= 70) return "Rare";
  return "Common";
}

function biasWithLuck(min, max, luck) {
  if (max <= min) return min;
  const range = max - min + 1;
  const rand = Math.floor(Math.random() * range);
  const bonus = Math.random() * 100 < luck ? Math.floor((range * luck) / 100) : 0;
  const result = min + rand + bonus;
  return result > max ? max : result;
}

function generateItem(bootsRarityMod = 0, vestLuckBoost = 0) {
  const itemType = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
  const rarity = generateRarity(bootsRarityMod);

  const image = getItemImageUrl(itemType, rarity);
  const id = crypto.randomUUID();

  const attributes = {};

  switch (itemType) {
    case "Boots":
      attributes.rarityModBonus = { Common: 1, Rare: 2, Epic: 3, Legendary: 4 }[rarity];
      break;

    case "Gloves":
      attributes.gemMultiplierBonus = randomInt(
        { Common: 1, Rare: 2, Epic: 2, Legendary: 4 }[rarity],
        { Common: 2, Rare: 5, Epic: 10, Legendary: 20 }[rarity]
      );
      break;

    case "Lamp":
      attributes.dropChanceBonus = biasWithLuck(
        { Common: 1, Rare: 2, Epic: 4, Legendary: 6 }[rarity],
        { Common: 3, Rare: 5, Epic: 8, Legendary: 15 }[rarity],
        vestLuckBoost
      );
      break;

    case "Pickaxe":
      attributes.flatPowerBonus = biasWithLuck(
        { Common: 1, Rare: 4, Epic: 7, Legendary: 10 }[rarity],
        { Common: 5, Rare: 10, Epic: 15, Legendary: 35 }[rarity],
        vestLuckBoost
      );
      // multiplier удалён
      break;

    case "Vest":
      attributes.vestLuckBoost = randomInt(
        { Common: 1, Rare: 3, Epic: 5, Legendary: 8 }[rarity],
        { Common: 3, Rare: 6, Epic: 10, Legendary: 15 }[rarity]
      );
      break;
  }

  return {
    id,
    type: itemType,
    rarity,
    image,
    attributes,
  };
}

export default generateItem;
