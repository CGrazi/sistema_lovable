import { describe, expect, it } from "vitest";
import { isAberta, parseValorBRL, STATUS_LIST } from "./os";

describe("valor da ordem de serviço", () => {
  it("aceita formato brasileiro com milhar e centavos", () => {
    expect(parseValorBRL("1.250,50")).toBe(1250.5);
  });
  it("aceita prefixo R$", () => {
    expect(parseValorBRL("R$ 89,90")).toBe(89.9);
  });
  it("aceita inteiro sem centavos", () => {
    expect(parseValorBRL("150")).toBe(150);
  });
  it("rejeita valor negativo ou texto", () => {
    expect(parseValorBRL("-10")).toBeNull();
    expect(parseValorBRL("abc")).toBeNull();
  });
});

describe("status da ordem", () => {
  it("entregue e cancelado não contam como abertas", () => {
    expect(isAberta("entregue")).toBe(false);
    expect(isAberta("cancelado")).toBe(false);
    expect(isAberta("em_reparo")).toBe(true);
  });
  it("tem 7 status, começando em Recebido", () => {
    expect(STATUS_LIST).toHaveLength(7);
    expect(STATUS_LIST[0].value).toBe("recebido");
  });
});
