export interface CepResult {
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
}

/** Busca o endereço pelo CEP via ViaCEP. Retorna null se inválido/não achado. */
export async function fetchCep(cepRaw: string): Promise<CepResult | null> {
  const cep = cepRaw.replace(/\D/g, '');
  if (cep.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return {
      endereco: data.logradouro ?? '',
      bairro: data.bairro ?? '',
      cidade: data.localidade ?? '',
      uf: data.uf ?? '',
    };
  } catch {
    return null;
  }
}
