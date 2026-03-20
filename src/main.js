/**
 * Вычесть скидку из цены, чтобы получить выручку.
 * Вычислить прибыль как разницу выручки и затрат.
 * Умножить на заданный процент бонуса и вернуть.
 */
/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // @TODO: Расчет выручки от операции
  // purchase — это одна из записей в поле items из чека в data.purchase_records
  // _product — это продукт из коллекции data.products
  const { discount, sale_price, quantity } = purchase;
  return (sale_price * quantity * (100 - discount)) / 100;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  // @TODO: Расчет бонуса от позиции в рейтинге
  const { profit } = seller;
  switch (index) {
    case 0:
      return 0.15 * profit;
    case 1:
    case 2:
      return 0.1 * profit;
    case total - 1:
      return 0 * profit;
    default:
      return 0.05 * profit;
  }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // @TODO: Проверка входных данных
  if (
    !data||
    !(Object.keys(data).length === 0)||
    !('customers' in data) ||
    !('sellers' in data) ||
    !('purchase_records' in data) ||
    !Array.isArray(data.customers) ||
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.purchase_records) ||
    data.customers.length === 0 ||
    data.sellers.length === 0 ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  }
  // @TODO: Проверка наличия опций
  const { calculateRevenue, calculateBonus } = options;
  if (
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    Error("Некорректные входные опции");
  }
  if (!calculateRevenue || !calculateBonus) {
    throw new Error("Чего-то не хватает");
  }
  // @TODO: Подготовка промежуточных данных для сбора статистики
  const sellerStats = data.sellers.map((seller) => ({
    // Заполним начальными данными
    id: seller.id,
    name: seller.first_name + " " + seller.last_name,
    revenue: 0, // Общая выручка с учётом скидок
    profit: 0, // Прибыль от продаж продавца
    sales_count: 0, // Количество продаж
    bonus: 0, // Итоговый бонус в рублях, не процент
    top_products: [],
    sales_product_count: 0,
    products_sold: {},
  }));
  // @TODO: Индексация продавцов и товаров для быстрого доступа
  const sellerIndex = sellerStats.reduce(
    (result, seller) => ({
      ...result,
      [seller.id]: seller,
    }),
    {},
  );
  const productIndex = data.products.reduce(
    (result, product) => ({
      ...result,
      [product.sku]: product,
    }),
    {},
  );
  // @TODO: Расчет выручки и прибыли для каждого продавца
  data.purchase_records.forEach((record) => {
    // Чек
    const seller = sellerIndex[record.seller_id]; // Продавец
    // Увеличить количество продаж
    seller.sales_count++;
    // Увеличить общую сумму выручки всех продаж
    seller.revenue += record.total_amount;
    // Расчёт прибыли для каждого товара
    record.items.forEach((item) => {
      const product = productIndex[item.sku]; // Товар
      // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
      const cost = product.purchase_price * item.quantity;
      // Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
      const revenue = calculateSimpleRevenue(item, product);
      // Посчитать прибыль: выручка минус себестоимость
      const profit = revenue - cost;
      // Увеличить общую накопленную прибыль (profit) у продавца
      seller.profit += profit;
      // Учёт количества проданных товаров
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      // По артикулу товара увеличить его проданное количество у продавца
      seller.products_sold[item.sku]++;
    });
  });
  // @TODO: Сортировка продавцов по прибыли
  sellerStats.sort((x, y) => {
    return Math.sign(y.profit - x.profit);
  });
  // @TODO: Назначение премий на основе ранжирования
  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, sellerStats.length, seller); // Считаем бонус
    // Формируем топ-10 товаров
    seller.top_products = Object.entries(seller.products_sold).map(
      (product) => ({ sku: product[0], quantity: product[1] }),
    );
    seller.top_products.sort((x, y) => {
      return Math.sign(y.quantity - x.quantity);
    });
    seller.top_products = seller.top_products.slice(0, 10);
  });
  // @TODO: Подготовка итоговой коллекции с нужными полями
  return sellerStats.map((seller) => ({
    seller_id: seller.id, // Строка, идентификатор продавца
    name: seller.name, // Строка, имя продавца
    revenue: +seller.revenue.toFixed(2), // Число с двумя знаками после точки, выручка продавца
    profit: +seller.profit.toFixed(2), // Число с двумя знаками после точки, прибыль продавца
    sales_count: +seller.sales_count.toFixed(0), // Целое число, количество продаж продавца
    top_products: seller.top_products, // Массив объектов вида: { "sku": "SKU_008","quantity": 10}, топ-10 товаров продавца
    bonus: +seller.bonus.toFixed(2), // Число с двумя знаками после точки, бонус продавца
  }));
}
