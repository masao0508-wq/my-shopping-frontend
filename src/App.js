import React, { useEffect, useMemo, useState } from 'react';

const API_URL = "https://shopping-app-8egl.onrender.com";
const STORAGE_KEY = "kon_date_stable_v101";

const roundAmount = (value) => Math.round(Number(value || 0) * 10) / 10;

const toNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeName = (name) => String(name || "").trim();

const parseIngredientsFromRecipe = (recipe = "") => {
  if (typeof recipe !== "string") return [];

  return recipe
    .split("\n")
    .map((line) => {
      const match = line.match(/^\s*[-・]?\s*([^:：\d]+?)\s*[:：]?\s*([\d.]+)\s*([^\s、,。]*)/);
      if (!match) return null;

      const item = normalizeName(match[1]);
      const amount = toNumber(match[2]);
      const unit = normalizeName(match[3]);
      if (!item || amount <= 0) return null;
      return { item, amount, unit };
    })
    .filter(Boolean);
};

const normalizeIngredients = (recipeObj) => {
  if (!recipeObj) return [];
  const explicit = Array.isArray(recipeObj.ingredients) ? recipeObj.ingredients : [];
  const parsed = explicit.length > 0 ? explicit : parseIngredientsFromRecipe(recipeObj.recipe);

  return parsed
    .map((ing) => ({
      item: normalizeName(ing.item || ing.name),
      amount: toNumber(ing.amount),
      unit: normalizeName(ing.unit),
    }))
    .filter((ing) => ing.item && ing.amount > 0);
};

const getDinnerIngredients = (menuDay) => [
  ...normalizeIngredients(menuDay?.main),
  ...normalizeIngredients(menuDay?.side),
];

const getLunchIngredients = (menuDay) => normalizeIngredients(menuDay?.lunch);

const normalizeShoppingItem = (item) => ({
  item: normalizeName(item?.item || item?.name),
  amount: roundAmount(toNumber(item?.amount)),
  unit: normalizeName(item?.unit),
});

const mergeShoppingItems = (items) => {
  const map = new Map();

  items.forEach((raw) => {
    const item = normalizeShoppingItem(raw);
    if (!item.item || item.amount <= 0) return;
    const key = `${item.item}__${item.unit}`;
    const current = map.get(key) || { ...item, amount: 0 };
    current.amount = roundAmount(current.amount + item.amount);
    map.set(key, current);
  });

  return Array.from(map.values());
};

const applyIngredients = (shoppingList, ingredients, multiplier) => {
  const map = new Map(
    mergeShoppingItems(shoppingList).map((item) => [`${item.item}__${item.unit}`, item])
  );

  normalizeIngredients({ ingredients }).forEach((ing) => {
    const key = `${ing.item}__${ing.unit}`;
    const current = map.get(key) || { item: ing.item, amount: 0, unit: ing.unit };
    current.amount = roundAmount(Math.max(0, current.amount + ing.amount * multiplier));

    if (current.amount > 0) {
      map.set(key, current);
    } else {
      map.delete(key);
    }
  });

  return Array.from(map.values()).sort((a, b) => a.item.localeCompare(b.item, "ja"));
};

const normalizeStockItem = (item) => {
  if (typeof item === "string") {
    const match = item.match(/^(.*?)\s*\((.*?)\)$/);
    const amountUnit = String(match?.[2] || "");
    const amountMatch = amountUnit.match(/^([\d.]+)\s*(.*)$/);
