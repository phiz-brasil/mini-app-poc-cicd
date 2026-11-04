// mutação ruim: pagamento direto no cliente
function pagar(valor) {
  return pz.payPhizOrder({ amount: valor });
}
