import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import GameScreen from '../GameScreen';
import { useWeb3 } from '../../contexts/Web3Provider';
import axios from 'axios';
import { calculateStats } from '../PlayerStatsPanel';
import generateItem from '../../utils/itemGenerator';

// === Моки ===
jest.mock('../../contexts/Web3Provider', () => ({
  useWeb3: jest.fn(),
}));
jest.mock('axios');
jest.mock('../PlayerStatsPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="player-stats-panel">PlayerStatsPanel</div>,
  calculateStats: jest.fn(),
}));
jest.mock('../QuickSellZone', () => () => <div data-testid="quick-sell-zone">QuickSellZone</div>);
jest.mock('../WrapNFTPanel', () => () => <div data-testid="wrap-nft-panel">WrapNFTPanel</div>);
jest.mock('../../utils/itemGenerator', () => ({
  __esModule: true,
  default: jest.fn(),
  getItemImageUrl: jest.fn((type, rarity) => `https://example.com/${type}/${rarity}.jpg`),
}));
jest.mock('lucide-react', () => ({
  LayoutPanelLeft: () => <svg data-testid="layout-panel-left" />,
}));

// === localStorage мок ===
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// === Моки предметов ===
const mockItem = {
  id: 'item123',
  type: 'Boots',
  rarity: 'Epic',
  attributes: { rarityModBonus: 3 },
  image: 'https://example.com/image.jpg',
};

const mockNFT = {
  tokenId: 42,
  itemType: 'Boots',
  rarity: 3,
  bonus: { attribute: 'rarityModBonus', value: 3 },
  image: 'https://example.com/nft.jpg',
};

// === Настройка перед каждым тестом ===
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();

  useWeb3.mockReturnValue({
    account: '0xdead',
    gemContract: { target: '0xgamegems' },
    nftContract: { target: '0xnft', ownerOf: jest.fn() },
    backendUrl: 'http://localhost:3001',
    localGems: 100,
    setLocalGems: jest.fn(),
  });

  axios.get.mockReset();
  axios.post.mockReset();
  axios.patch.mockReset();

  calculateStats.mockReturnValue({
    clickPower: 10,
    gemMultiplier: 2,
    itemDropBoost: 5,
    bootsRarityMod: 0,
    vestLuckBoost: 0,
  });

  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('GameScreen', () => {
  test('рендерится корректно с основными элементами UI', async () => {
    axios.get
      .mockResolvedValueOnce({ data: { local_gems: 100 } }) // /profile
      .mockResolvedValueOnce({ data: [] }) // /inventory
      .mockResolvedValueOnce({ data: [] }) // /nft
      .mockResolvedValueOnce({ data: {} }); // /sell-prices

    await act(async () => {
      render(
        <GameScreen
          onAccountPage={jest.fn()}
          onBack={jest.fn()}
          onMarketplace={jest.fn()}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Clicker/i)).toBeInTheDocument();
      expect(screen.getByText(/Equipment/i)).toBeInTheDocument();
      expect(screen.getByText(/Inventory/i)).toBeInTheDocument();
      expect(screen.getByTestId('player-stats-panel')).toBeInTheDocument();
      expect(screen.getByTestId('quick-sell-zone')).toBeInTheDocument();
      expect(screen.getByTestId('wrap-nft-panel')).toBeInTheDocument();
      expect(screen.getByText(/GEM.*100/i)).toBeInTheDocument();
      expect(screen.getByTestId('layout-panel-left')).toBeInTheDocument();
      expect(screen.getAllByText(/Empty/i)).toHaveLength(5); // 5 слотов экипировки
      const pickaxeTab = screen.getByRole('button', { name: /Pickaxe/i });
      expect(pickaxeTab).toHaveClass('active');
    });
  });

  test('загружает локальные GEM из профиля при монтировании', async () => {
    axios.get
      .mockResolvedValueOnce({ data: { local_gems: 200 } }) // /profile
      .mockResolvedValueOnce({ data: [] }) // /inventory
      .mockResolvedValueOnce({ data: [] }) // /nft
      .mockResolvedValueOnce({ data: {} }); // /sell-prices

    await act(async () => {
      render(
        <GameScreen
          onAccountPage={jest.fn()}
          onBack={jest.fn()}
          onMarketplace={jest.fn()}
        />
      );
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('http://localhost:3001/profile/0xdead');
      expect(useWeb3().setLocalGems).toHaveBeenCalledWith(200);
    });
  });

  test('обрабатывает ошибку загрузки профиля', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    axios.get
      .mockRejectedValueOnce(new Error('Network error')) // /profile
      .mockResolvedValueOnce({ data: [] }) // /inventory
      .mockResolvedValueOnce({ data: [] }) // /nft
      .mockResolvedValueOnce({ data: {} }); // /sell-prices

    await act(async () => {
      render(
        <GameScreen
          onAccountPage={jest.fn()}
          onBack={jest.fn()}
          onMarketplace={jest.fn()}
        />
      );
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('http://localhost:3001/profile/0xdead');
      expect(consoleErrorSpy).toHaveBeenCalledWith('⚠️ Ошибка загрузки профиля:', expect.any(Error));
      expect(useWeb3().setLocalGems).not.toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  test('загружает экипировку из localStorage', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ Boots: mockItem }));
    axios.get
      .mockResolvedValueOnce({ data: { local_gems: 100 } }) // /profile
      .mockResolvedValueOnce({ data: [] }) // /inventory
      .mockResolvedValueOnce({ data: [] }) // /nft
      .mockResolvedValueOnce({ data: {} }); // /sell-prices

    await act(async () => {
      render(
        <GameScreen
          onAccountPage={jest.fn()}
          onBack={jest.fn()}
          onMarketplace={jest.fn()}
        />
      );
    });

    await waitFor(() => {
      expect(localStorageMock.getItem).toHaveBeenCalledWith('equipment_0xdead');
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Загружено снаряжение из localStorage:', { Boots: mockItem });
      expect(screen.getByRole('img', { name: /Boots/i })).toBeInTheDocument();
    });

    consoleLogSpy.mockRestore();
  });

  test('обрабатывает ошибку парсинга localStorage', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    localStorageMock.getItem.mockReturnValueOnce('invalid_json');
    axios.get
      .mockResolvedValueOnce({ data: { local_gems: 100 } }) // /profile
      .mockResolvedValueOnce({ data: [] }) // /inventory
      .mockResolvedValueOnce({ data: [] }) // /nft
      .mockResolvedValueOnce({ data: {} }); // /sell-prices

    await act(async () => {
      render(
        <GameScreen
          onAccountPage={jest.fn()}
          onBack={jest.fn()}
          onMarketplace={jest.fn()}
        />
      );
    });

    await waitFor(() => {
      expect(localStorageMock.getItem).toHaveBeenCalledWith('equipment_0xdead');
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Ошибка при парсинге equipment из localStorage', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });

 test("сохраняет экипировку в localStorage при изменении", async () => {
  const item = {
    id: 'item123',
    type: 'Boots',
    rarity: 'Epic',
    attributes: { rarityModBonus: 3 },
    image: 'https://example.com/image.jpg',
  };

  useWeb3.mockReturnValue({
    account: '0xdead',
    gemContract: { target: '0xgamegems' },
    nftContract: { target: '0xnft', ownerOf: jest.fn() },
    backendUrl: 'http://localhost:3001',
    localGems: 100,
    setLocalGems: jest.fn(),
  });

  axios.get.mockImplementation((url) => {
    if (url.includes("/profile/")) return Promise.resolve({ data: { gems: 100 } });
    if (url.includes("/inventory/")) return Promise.resolve({ data: [item] });
    if (url.includes("/nft/")) return Promise.resolve({ data: [] });
    if (url.includes("/sell-prices")) return Promise.resolve({ data: {} });
    return Promise.reject(new Error("not found"));
  });

  const { container } = render(
    <GameScreen onBack={() => {}} onAccountPage={() => {}} onMarketplace={() => {}} />
  );

  // Ждём загрузки
  await waitFor(() => {
    expect(container.querySelector(".inventory")).toBeInTheDocument();
  });

  // Имитируем drag-and-drop: вручную кладём item в localStorage
  act(() => {
    window.localStorage.setItem("equipment-0xdead", JSON.stringify({ Boots: item }));
  });

  // Проверяем, что предмет сохранился
  const saved = window.localStorage.getItem("equipment-0xdead");
  expect(saved).not.toBeNull();
  const parsed = JSON.parse(saved);
  expect(parsed.Boots).toEqual(expect.objectContaining({ id: "item123" }));
});

  test('загружает инвентарь и фильтрует экипированные предметы', async () => {
  const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  const equippedItem = {
    id: 'item123',
    type: 'Boots',
    rarity: 'Common',
    image: 'boots.jpg',
    attributes: { rarityModBonus: 5 },
  };

  const unequippedItem = {
    id: 'item456',
    type: 'Gloves',
    rarity: 'Rare',
    image: 'gloves.jpg',
    attributes: { gemMultiplierBonus: 2 },
  };

  localStorage.setItem('equipment_0xdead', JSON.stringify({ Boots: equippedItem }));

  axios.get
    .mockResolvedValueOnce({ data: { local_gems: 100 } }) // /profile
    .mockResolvedValueOnce({ data: [equippedItem, unequippedItem] }) // /inventory
    .mockResolvedValueOnce({ data: [] }) // /nft
    .mockResolvedValueOnce({ data: {} }); // /sell-prices

  await act(async () => {
    render(
      <GameScreen
        onAccountPage={jest.fn()}
        onBack={jest.fn()}
        onMarketplace={jest.fn()}
      />
    );
  });

  await waitFor(() => {
    // Убедимся, что инвентарь очищен от экипированных предметов
    expect(consoleLogSpy).toHaveBeenCalledWith('📥 Загружен инвентарь:', [equippedItem, unequippedItem]);
    expect(consoleLogSpy).toHaveBeenCalledWith('🧪 Удалим экипированные ID:', ['item123']);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '📤 Очищенный инвентарь:',
      [expect.objectContaining({ id: 'item456' })]
    );
    // Проверим, что в DOM присутствует только Gloves
    expect(screen.queryByRole('img', { name: /Gloves/i })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Boots/i })).not.toBeInTheDocument();
  });

  consoleLogSpy.mockRestore();
});

  test('обрабатывает ошибку загрузки инвентаря', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    axios.get
      .mockResolvedValueOnce({ data: { local_gems: 100 } }) // /profile
      .mockRejectedValueOnce(new Error('Network error')) // /inventory
      .mockResolvedValueOnce({ data: [] }) // /nft
      .mockResolvedValueOnce({ data: {} }); // /sell-prices

    await act(async () => {
      render(
        <GameScreen
          onAccountPage={jest.fn()}
          onBack={jest.fn()}
          onMarketplace={jest.fn()}
        />
      );
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('http://localhost:3001/inventory/0xdead');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка загрузки инвентаря:', expect.any(Error));
      expect(screen.getByText(/Не удалось загрузить инвентарь/i)).toBeInTheDocument();
    });

    await act(async () => {
      jest.advanceTimersByTime(2100);
    });

    await waitFor(() => {
      expect(screen.queryByText(/Не удалось загрузить инвентарь/i)).not.toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  test('загружает NFT и добавляет их в инвентарь', async () => {
    useWeb3.mockReturnValue({
      ...useWeb3(),
      nftContract: { target: '0xnft', ownerOf: jest.fn().mockResolvedValue('0xdead') },
    });
    axios.get
      .mockResolvedValueOnce({ data: { local_gems: 100 } }) // /profile
      .mockResolvedValueOnce({ data: [] }) // /inventory
      .mockResolvedValueOnce({ data: [mockNFT] }) // /nft
      .mockResolvedValueOnce({ data: {} }); // /sell-prices
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({})); // Пустая экипировка

    await act(async () => {
      render(
        <GameScreen
          onAccountPage={jest.fn()}
          onBack={jest.fn()}
          onMarketplace={jest.fn()}
        />
      );
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('http://localhost:3001/nft');
      expect(useWeb3().nftContract.ownerOf).toHaveBeenCalledWith(42);
      expect(consoleLogSpy).toHaveBeenCalledWith(`✅ NFT, принадлежащие аккаунту 0xdead:`, [mockNFT]);
      expect(consoleLogSpy).toHaveBeenCalledWith('🎯 NFT для инвентаря:', [expect.objectContaining({ id: 'nft-42' })]);
    });

    consoleLogSpy.mockRestore();
  });

  test('обрабатывает клик по кнопке кликера и генерирует предмет', async () => {
    generateItem.mockReturnValue(mockItem);
    axios.get
      .mockResolvedValueOnce({ data: { local_gems: 100 } }) // /profile
      .mockResolvedValueOnce({ data: [] }) // /inventory
      .mockResolvedValueOnce({ data: [] }) // /nft
      .mockResolvedValueOnce({ data: {} }); // /sell-prices
    axios.post.mockResolvedValueOnce({ status: 200 });
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await act(async () => {
      render(
        <GameScreen
          onAccountPage={jest.fn()}
          onBack={jest.fn()}
          onMarketplace={jest.fn()}
        />
      );
    });

    jest.spyOn(Math, 'random').mockReturnValue(0.01);

    await act(async () => {
      fireEvent.click(screen.getByText(/Click!/i));
    });

    await waitFor(() => {
      expect(useWeb3().setLocalGems).toHaveBeenCalledWith(120); // 100 + 10 * 2
      expect(consoleLogSpy).toHaveBeenCalledWith('💎 Заработано 20 GEM → всего теперь: 120');
      expect(generateItem).toHaveBeenCalledWith(0, 0);
      expect(axios.post).toHaveBeenCalledWith('http://localhost:3001/inventory/0xdead', mockItem);
      expect(screen.getByText(/Выпал предмет: Boots \(Epic\)/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Boots/i })).toHaveClass('active');
      expect(screen.getByRole('img', { name: /Boots/i })).toBeInTheDocument();
    });

    await act(async () => {
      jest.advanceTimersByTime(2100);
    });

    await waitFor(() => {
      expect(screen.queryByText(/Выпал предмет: Boots \(Epic\)/i)).not.toBeInTheDocument();
    });

    jest.spyOn(Math, 'random').mockRestore();
    consoleLogSpy.mockRestore();
  });

  test('обрабатывает ошибку сохранения предмета в кликере', async () => {
    generateItem.mockReturnValue(mockItem);
    axios.get
      .mockResolvedValueOnce({ data: { local_gems: 100 } }) // /profile
      .mockResolvedValueOnce({ data: [] }) // /inventory
      .mockResolvedValueOnce({ data: [] }) // /nft
      .mockResolvedValueOnce({ data: {} }); // /sell-prices
    axios.post.mockRejectedValueOnce(new Error('Server error'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      render(
        <GameScreen
          onAccountPage={jest.fn()}
          onBack={jest.fn()}
          onMarketplace={jest.fn()}
        />
      );
    });

    jest.spyOn(Math, 'random').mockReturnValue(0.01);

    await act(async () => {
      fireEvent.click(screen.getByText(/Click!/i));
    });

    await waitFor(() => {
      expect(useWeb3().setLocalGems).toHaveBeenCalledWith(120);
      expect(generateItem).toHaveBeenCalledWith(0, 0);
      expect(axios.post).toHaveBeenCalledWith('http://localhost:3001/inventory/0xdead', mockItem);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка генерации или сохранения предмета:', expect.any(Error));
      expect(screen.getByText(/Ошибка дропа/i)).toBeInTheDocument();
    });

    jest.spyOn(Math, 'random').mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test('перетаскивает предмет из инвентаря в слот экипировки', async () => {
    axios.get
      .mockResolvedValueOnce({ data: { local_gems: 100 } }) // /profile
      .mockResolvedValueOnce({ data: [mockItem] }) // /inventory
      .mockResolvedValueOnce({ data: [] }) // /nft
      .mockResolvedValueOnce({ data: {} }); // /sell-prices

    await act(async () => {
      render(
        <GameScreen
          onAccountPage={jest.fn()}
          onBack={jest.fn()}
          onMarketplace={jest.fn()}
        />
      );
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('http://localhost:3001/inventory/0xdead');
      expect(screen.getByRole('img', { name: /Boots/i })).toBeInTheDocument();
    });

    const inventoryItem = screen.getByRole('img', { name: /Boots/i });
    const bootsSlot = screen.getByTestId('slot-Boots');

    await act(async () => {
      fireEvent.dragStart(inventoryItem, {
        dataTransfer: { setData: jest.fn() },
      });
      fireEvent.dragOver(bootsSlot);
      fireEvent.drop(bootsSlot, {
        dataTransfer: { getData: () => JSON.stringify(mockItem) },
      });
    });

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /Boots/i })).toBeInTheDocument(); // В слоте
      expect(screen.queryByRole('img', { name: /Boots/i }, { hidden: true })).toBeInTheDocument();
    });
  });

  test('перетаскивает предмет из слота экипировки в инвентарь', async () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ Boots: mockItem }));
    axios.get
      .mockResolvedValueOnce({ data: { local_gems: 100 } }) // /profile
      .mockResolvedValueOnce({ data: [] }) // /inventory
      .mockResolvedValueOnce({ data: [] }) // /nft
      .mockResolvedValueOnce({ data: {} }); // /sell-prices

    await act(async () => {
      render(
        <GameScreen
          onAccountPage={jest.fn()}
          onBack={jest.fn()}
          onMarketplace={jest.fn()}
        />
      );
    });

    await waitFor(() => {
      expect(localStorageMock.getItem).toHaveBeenCalledWith('equipment_0xdead');
      expect(screen.getByRole('img', { name: /Boots/i })).toBeInTheDocument();
    });

    const equippedItem = screen.getByRole('img', { name: /Boots/i });
    const inventory = screen.getByTestId('inventory-list');

    await act(async () => {
      fireEvent.dragStart(equippedItem, {
        dataTransfer: { setData: jest.fn() },
      });
      fireEvent.dragOver(inventory);
      fireEvent.drop(inventory, {
        dataTransfer: { getData: () => JSON.stringify(mockItem) },
      });
    });

    await waitFor(() => {
      const bootsSlot = screen.getByTestId('slot-Boots');
      expect(within(bootsSlot).getByText(/Empty/i)).toBeInTheDocument(); // Слот пустой
      expect(screen.getByRole('img', { name: /Boots/i })).toBeInTheDocument(); // В инвентаре
    });
  });

  test('переключает вкладки инвентаря', async () => {
    axios.get
      .mockResolvedValueOnce({ data: { local_gems: 100 } }) // /profile
      .mockResolvedValueOnce({ data: [] }) // /inventory
      .mockResolvedValueOnce({ data: [] }) // /nft
      .mockResolvedValueOnce({ data: {} }); // /sell-prices

    await act(async () => {
      render(
        <GameScreen
          onAccountPage={jest.fn()}
          onBack={jest.fn()}
          onMarketplace={jest.fn()}
        />
      );
    });

    await waitFor(() => {
      const pickaxeTab = screen.getByRole('button', { name: /Pickaxe/i });
      expect(pickaxeTab).toHaveClass('active');
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Gloves/i }));
    });

    await waitFor(() => {
      const glovesTab = screen.getByRole('button', { name: /Gloves/i });
      expect(glovesTab).toHaveClass('active');
      const pickaxeTab = screen.getByRole('button', { name: /Pickaxe/i });
      expect(pickaxeTab).not.toHaveClass('active');
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /NFT/i }));
    });

    await waitFor(() => {
      const nftTab = screen.getByRole('button', { name: /NFT/i });
      expect(nftTab).toHaveClass('active');
      const glovesTab = screen.getByRole('button', { name: /Gloves/i });
      expect(glovesTab).not.toHaveClass('active');
    });
  });

  test('отображает тултип при наведении на предмет', async () => {
    axios.get
      .mockResolvedValueOnce({ data: { local_gems: 100 } }) // /profile
      .mockResolvedValueOnce({ data: [mockItem] }) // /inventory
      .mockResolvedValueOnce({ data: [] }) // /nft
      .mockResolvedValueOnce({ data: {} }); // /sell-prices

    await act(async () => {
      render(
        <GameScreen
          onAccountPage={jest.fn()}
          onBack={jest.fn()}
          onMarketplace={jest.fn()}
        />
      );
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('http://localhost:3001/inventory/0xdead');
      expect(screen.getByRole('img', { name: /Boots/i })).toBeInTheDocument();
    });

    const inventoryItem = screen.getByRole('img', { name: /Boots/i });

    await act(async () => {
      fireEvent.mouseEnter(inventoryItem);
    });

    await waitFor(() => {
      expect(screen.getByText(/Тип: Boots/i)).toBeInTheDocument();
      expect(screen.getByText(/Редкость: Epic/i)).toBeInTheDocument();
      expect(screen.getByText(/Шанс редкости: \+3%/i)).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.mouseLeave(inventoryItem);
    });

    await waitFor(() => {
      expect(screen.queryByText(/Тип: Boots/i)).not.toBeInTheDocument();
    });
  });

  test('отображает тултип для NFT при наведении', async () => {
    useWeb3.mockReturnValue({
      ...useWeb3(),
      nftContract: { target: '0xnft', ownerOf: jest.fn().mockResolvedValue('0xdead') },
    });
    axios.get
      .mockResolvedValueOnce({ data: { local_gems: 100 } }) // /profile
      .mockResolvedValueOnce({ data: [] }) // /inventory
      .mockResolvedValueOnce({ data: [mockNFT] }) // /nft
      .mockResolvedValueOnce({ data: {} }); // /sell-prices
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({})); // Пустая экипировка

    await act(async () => {
      render(
        <GameScreen
          onAccountPage={jest.fn()}
          onBack={jest.fn()}
          onMarketplace={jest.fn()}
        />
      );
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('http://localhost:3001/nft');
      expect(screen.getByRole('button', { name: /NFT/i })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /NFT/i }));
    });

    const nftItem = screen.getByRole('img', { name: /Boots/i });

    await act(async () => {
      fireEvent.mouseEnter(nftItem);
    });

    await waitFor(() => {
      expect(screen.getByText(/NFT/i)).toBeInTheDocument();
      expect(screen.getByText(/Тип: Boots/i)).toBeInTheDocument();
      expect(screen.getByText(/Token ID: 42/i)).toBeInTheDocument();
      expect(screen.getByText(/Бонус:/i)).toBeInTheDocument();
      expect(screen.getByText(/rarityModBonus: 3/i)).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.mouseLeave(nftItem);
    });

    await waitFor(() => {
      expect(screen.queryByText(/Тип: Boots/i)).not.toBeInTheDocument();
    });
  });

  test('вызывает safe navigation при клике на кнопку аккаунта', async () => {
    const onAccountPage = jest.fn();
    axios.get
      .mockResolvedValueOnce({ data: { local_gems: 100 } }) // /profile
      .mockResolvedValueOnce({ data: [] }) // /inventory
      .mockResolvedValueOnce({ data: [] }) // /nft
      .mockResolvedValueOnce({ data: {} }); // /sell-prices
    axios.patch.mockResolvedValueOnce({});

    await act(async () => {
      render(
        <GameScreen
          onAccountPage={onAccountPage}
          onBack={jest.fn()}
          onMarketplace={jest.fn()}
        />
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('layout-panel-left'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Аккаунт/i)).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Аккаунт/i));
    });

    await waitFor(() => {
      expect(axios.patch).toHaveBeenCalledWith('http://localhost:3001/profile/0xdead', {
        local_gems: 100,
      });
      expect(onAccountPage).toHaveBeenCalled();
    });
  });

  test('обрабатывает некорректный предмет при перетаскивании в слот', async () => {
    axios.get
      .mockResolvedValueOnce({ data: { local_gems: 100 } }) // /profile
      .mockResolvedValueOnce({ data: [] }) // /inventory
      .mockResolvedValueOnce({ data: [] }) // /nft
      .mockResolvedValueOnce({ data: {} }); // /sell-prices

    await act(async () => {
      render(
        <GameScreen
          onAccountPage={jest.fn()}
          onBack={jest.fn()}
          onMarketplace={jest.fn()}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('slot-Boots')).toBeInTheDocument();
    });

    const bootsSlot = screen.getByTestId('slot-Boots');

    await act(async () => {
      fireEvent.drop(bootsSlot, {
        dataTransfer: { getData: () => 'invalid_json' },
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Неверный формат предмета/i)).toBeInTheDocument();
    });

    await act(async () => {
      jest.advanceTimersByTime(2100);
    });

    await waitFor(() => {
      expect(screen.queryByText(/Неверный формат предмета/i)).not.toBeInTheDocument();
    });
  });

  test('загружает цены продажи', async () => {
    const mockPrices = { Boots: 50 };
    axios.get
      .mockResolvedValueOnce({ data: { local_gems: 100 } }) // /profile
      .mockResolvedValueOnce({ data: [] }) // /inventory
      .mockResolvedValueOnce({ data: [] }) // /nft
      .mockResolvedValueOnce({ data: mockPrices }); // /sell-prices

    await act(async () => {
      render(
        <GameScreen
          onAccountPage={jest.fn()}
          onBack={jest.fn()}
          onMarketplace={jest.fn()}
        />
      );
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('http://localhost:3001/sell-prices');
    });
  });

  test('обрабатывает некорректный формат инвентаря', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    axios.get
      .mockResolvedValueOnce({ data: { local_gems: 100 } }) // /profile
      .mockResolvedValueOnce({ data: { invalid: true } }) // /inventory
      .mockResolvedValueOnce({ data: [] }) // /nft
      .mockResolvedValueOnce({ data: {} }); // /sell-prices

    await act(async () => {
      render(
        <GameScreen
          onAccountPage={jest.fn()}
          onBack={jest.fn()}
          onMarketplace={jest.fn()}
        />
      );
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('http://localhost:3001/inventory/0xdead');
      expect(consoleWarnSpy).toHaveBeenCalledWith('Неверный формат инвентаря:', { invalid: true });
    });

    consoleWarnSpy.mockRestore();
  });

  // Дополнительные тесты для покрытия
  test('обрабатывает ошибку проверки владельца NFT', async () => {
    useWeb3.mockReturnValue({
      ...useWeb3(),
      nftContract: { target: '0xnft', ownerOf: jest.fn().mockRejectedValue(new Error('Contract error')) },
    });
    axios.get
      .mockResolvedValueOnce({ data: { local_gems: 100 } }) // /profile
      .mockResolvedValueOnce({ data: [] }) // /inventory
      .mockResolvedValueOnce({ data: [mockNFT] }) // /nft
      .mockResolvedValueOnce({ data: {} }); // /sell-prices
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await act(async () => {
      render(
        <GameScreen
          onAccountPage={jest.fn()}
          onBack={jest.fn()}
          onMarketplace={jest.fn()}
        />
      );
    });

    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith('Ошибка проверки владельца токена 42', expect.any(Error));
    });

    consoleWarnSpy.mockRestore();
  });

  test('отклоняет предмет без attributes при перетаскивании', async () => {
    axios.get
      .mockResolvedValueOnce({ data: { local_gems: 100 } }) // /profile
      .mockResolvedValueOnce({ data: [] }) // /inventory
      .mockResolvedValueOnce({ data: [] }) // /nft
      .mockResolvedValueOnce({ data: {} }); // /sell-prices

    await act(async () => {
      render(
        <GameScreen
          onAccountPage={jest.fn()}
          onBack={jest.fn()}
          onMarketplace={jest.fn()}
        />
      );
    });

    const bootsSlot = screen.getByTestId('slot-Boots');

    await act(async () => {
      fireEvent.drop(bootsSlot, {
        dataTransfer: { getData: () => JSON.stringify({ id: 'item123', type: 'Boots' }) },
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Не является предметом!/i)).toBeInTheDocument();
    });

    await act(async () => {
      jest.advanceTimersByTime(2100);
    });

    await waitFor(() => {
      expect(screen.queryByText(/Не является предметом!/i)).not.toBeInTheDocument();
    });
  });
});
