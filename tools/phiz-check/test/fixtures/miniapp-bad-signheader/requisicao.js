// mutação ruim: headers de assinatura da plataforma saindo do cliente
function chamarPlataforma(url) {
  return pz.request({ url: url, header: { "X-Sign-Mac": "abc123", "X-Sign-Salt": "s3cre1" } });
}
