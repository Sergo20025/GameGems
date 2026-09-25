// src/components/__tests__/PlayerStatsPanel.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import PlayerStatsPanel from '../PlayerStatsPanel';

describe('PlayerStatsPanel', () => {
  it('отображает дефолтные характеристики при пустом equipment', () => {
    render(<PlayerStatsPanel equipment={{}} />);
    expect(screen.getByText(/Сила клика: 1/)).toBeInTheDocument();
    expect(screen.getByText(/x1.00/)).toBeInTheDocument();
    expect(screen.getByText(/ботинки.*0%/i)).toBeInTheDocument();
    expect(screen.getByText(/жилет.*0%/i)).toBeInTheDocument();
    expect(screen.getByText(/дропа.*0%/i)).toBeInTheDocument();
  });

  it('отображает корректные характеристики на основе equipment', () => {
    const equipment = {
      Boots: { type: 'Boots', attributes: { rarityModBonus: 5 } },
      Vest: { type: 'Vest', attributes: { vestLuckBoost: 3 } },
      Lamp: { type: 'Lamp', attributes: { dropChanceBonus: 7 } },
      Pickaxe: { type: 'Pickaxe', attributes: { flatPowerBonus: 4 } },
      Gloves: { type: 'Gloves', attributes: { gemMultiplierBonus: 2 } },
    };

    render(<PlayerStatsPanel equipment={equipment} />);

    expect(screen.getByText(/Сила клика: 5/)).toBeInTheDocument();
    expect(screen.getByText(/x2.00/)).toBeInTheDocument();
    expect(screen.getByText(/ботинки.*5%/i)).toBeInTheDocument();
    expect(screen.getByText(/жилет.*3%/i)).toBeInTheDocument();
    expect(screen.getByText(/дропа.*7%/i)).toBeInTheDocument();
  });

  it('игнорирует некорректные предметы и неизвестные типы', () => {
    const equipment = {
      empty: null,
      noAttributes: { type: 'Pickaxe' }, // без attributes
      badGloves: { type: 'Gloves', attributes: {} }, // без бонуса
      unknown: { type: 'Helmet', attributes: { some: 123 } }, // неизвестный тип
    };

    render(<PlayerStatsPanel equipment={equipment} />);

    expect(screen.getByText(/Сила клика: 1/)).toBeInTheDocument(); // не изменился
    expect(screen.getByText(/x1.00/)).toBeInTheDocument(); // не изменился
    expect(screen.getByText(/ботинки.*0%/i)).toBeInTheDocument();
    expect(screen.getByText(/жилет.*0%/i)).toBeInTheDocument();
    expect(screen.getByText(/дропа.*0%/i)).toBeInTheDocument();
  });

  it('использует значения по умолчанию, если бонусы отсутствуют', () => {
  const equipment = {
    Boots: { type: 'Boots', attributes: {} },
    Vest: { type: 'Vest', attributes: {} },
    Lamp: { type: 'Lamp', attributes: {} },
    Pickaxe: { type: 'Pickaxe', attributes: {} },
    Gloves: { type: 'Gloves', attributes: {} },
  };

  render(<PlayerStatsPanel equipment={equipment} />);

  expect(screen.getByText(/Сила клика: 1/)).toBeInTheDocument();
  expect(screen.getByText(/x1.00/)).toBeInTheDocument();
  expect(screen.getByText(/ботинки.*0%/i)).toBeInTheDocument();
  expect(screen.getByText(/жилет.*0%/i)).toBeInTheDocument();
  expect(screen.getByText(/дропа.*0%/i)).toBeInTheDocument();
});
});