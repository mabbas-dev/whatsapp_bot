const mysql = require('mysql');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

// Using connection pooling for efficient database management
const pool = mysql.createPool({
  connectionLimit: 10,
  host: '82.197.82.121',
  user: 'u132832831_dev_bot',
  password: '@Jhon___112',
  database: 'u132832831_dev_bot'
});

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('message', async msg => {
    const senderNumber = msg.from.split('@')[0];

    // Check user registration for every command
    pool.query('SELECT name FROM users WHERE phone_no = ?', [senderNumber], (error, results) => {
        if (error) {
            msg.reply('There was an error accessing the registration data. 😞');
            return console.error(error);
        }
        if (results.length === 0) {
            msg.reply('Please contact the admin for registration. 🚫👤');
            return;
        }
        const userName = results[0].name;

        // Commands processing
        if (msg.body === '.start') {
            msg.reply(`Welcome back, *${userName}*! 🎉\nType *'.products'* to view available products.`);
        } else if (msg.body === '.products') {
            pool.query('SELECT * FROM products', (error, results) => {
                if (error) {
                    msg.reply('Error fetching products. 😞');
                    return console.error(error);
                }
                if (results.length > 0) {
                    let replyMsg = '*Available products:*\n';
                    results.forEach((product, index) => {
                        replyMsg += `*.${index + 1}* ${product.product_name}\n`;
                    });
                    replyMsg += '\nReply with the product number to select it. e.g *".1"*';
                    msg.reply(replyMsg);
                } else {
                    msg.reply('No products found. 😢');
                }
            });
        } else if (msg.body.startsWith('.')) {
            const index = parseInt(msg.body.substring(1)) - 1;
            pool.query('SELECT * FROM products', async (error, results) => {
                if (error) {
                    msg.reply('Error fetching product details. 😞');
                    return console.error(error);
                }
                if (index >= 0 && index < results.length) {
                    const product = results[index];
                    // Check stock availability and handle sale
                    const checkStockQuery = 'SELECT * FROM products_stock WHERE products_name = ? AND sold_yes_no = 0 LIMIT 1';
                    pool.query(checkStockQuery, [product.product_name], (error, stockResults) => {
                        if (error) {
                            msg.reply('Error checking stock.');
                            return console.error(error);
                        }
                        if (stockResults.length > 0) {
                            // Mark as sold and send credentials
                            const stockItem = stockResults[0];
                            const updateStockQuery = 'UPDATE products_stock SET sold_yes_no = 1, sold_to_user = ?, date_and_time = NOW() WHERE id = ?';
                            pool.query(updateStockQuery, [senderNumber, stockItem.id], (error, updateResults) => {
                                if (error) {
                                    msg.reply('Error updating stock item.');
                                    return console.error(error);
                                }
                                msg.reply(`Thanks for purchasing *${product.product_name}*! 🛒\n\nHere are your login credentials:\n\n*Email:* ${stockItem.email}\n*Password:* ${stockItem.password}`);
                            });
                        } else {
                            msg.reply('Sorry, this product is currently out of stock. 😢');
                        }
                    });
                } else {
                    msg.reply('Invalid product selection. 🚫');
                }
            });
        } else if (msg.body === 'ping') {
            msg.reply('*pong* 🏓');
        } 
        else if (msg.body.toLowerCase() === 'help') {
            msg.reply(`*Commands List:*\n1 *'.start'* - Start the Bot and get a welcome message.\n2 *'.products'* - Show all Products Available.\n3 *'.help'* - Show this help message.`);
        }
    });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.initialize();
