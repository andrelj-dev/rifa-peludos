exports.handler = async function (event, context) {
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Método não permitido" })
        };
    }

    try {
        const payload = JSON.parse(event.body);

        const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || payload.fallbackToken;

        if (!MP_ACCESS_TOKEN) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Token de acesso do Mercado Pago não configurado no servidor." })
            };
        }

        const cleanCpf = String(payload.cpf || "").replace(/\D/g, "");

        const mpBody = {
            transaction_amount: Number(payload.amount),
            description: `Rifa: ${payload.raffleName} (Bilhetes: ${payload.numbers.join(", ")})`,
            payment_method_id: payload.method === "debito_conta" ? "bank_transfer" : "pix",
            payer: {
                email: "comprador@rifasolidaria.com.br",
                first_name: payload.name,
                identification: {
                    type: "CPF",
                    number: cleanCpf
                }
            }
        };

        const response = await fetch("https://api.mercadopago.com/v1/payments", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
                "X-Idempotency-Key": `${Date.now()}-${cleanCpf}`
            },
            body: JSON.stringify(mpBody)
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({
                    error: data.message || "Erro na API do Mercado Pago",
                    details: data
                })
            };
        }

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                success: true,
                paymentId: data.id,
                status: data.status,
                pixCopiaCola: data.point_of_interaction?.transaction_data?.qr_code || "",
                qrCodeBase64: data.point_of_interaction?.transaction_data?.qr_code_base64 || ""
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Erro interno no servidor Netlify: " + error.message })
        };
    }
};