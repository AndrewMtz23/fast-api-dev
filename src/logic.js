const calculateValue = (price, stock) => {
  if (price < 0 || stock < 0) return 0
  return price * stock
}

const isInStock = (stock) => {
  return stock > 0
}

module.exports = { calculateValue, isInStock }