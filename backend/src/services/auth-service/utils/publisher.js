import amqp from "amqplib";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
let channel = null;

export const initRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue("notifications", { durable: true });
    console.log("[AUTH-SERVICE] Connected to RabbitMQ successfully");
  } catch (error) {
    console.error("[AUTH-SERVICE] Failed to connect to RabbitMQ:", error.message);
    // Retry connection after 5 seconds to support Docker start sequencing
    setTimeout(initRabbitMQ, 5000);
  }
};

export const publishNotification = (type, email, data) => {
  if (!channel) {
    console.warn("[AUTH-SERVICE] RabbitMQ channel not initialized. Logging fallback:", data);
    // Simulate email in console log if RabbitMQ is unavailable
    console.log(`\n=================== FALLBACK EMAIL SIMULATION ===================`);
    console.log(`To: ${email}`);
    console.log(`Type: ${type}`);
    console.log(`Data:`, data);
    console.log(`==================================================================\n`);
    return;
  }
  const payload = JSON.stringify({ type, email, data });
  channel.sendToQueue("notifications", Buffer.from(payload), { persistent: true });
  console.log(`[AUTH-SERVICE] Published ${type} notification to queue for ${email}`);
};
