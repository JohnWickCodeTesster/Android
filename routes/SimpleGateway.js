var express = require("express");
var router = express.Router();
const { SerialPort } = require("serialport");
var cors = require("cors");
var mysql = require("mysql2");
var message = "2"; // Thiết lập mode đọc dữ liệu
var result = "";
var str = "";

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "123456",
  database: "csdl_cambiendoam",
});

// Step 1: Mở kết nối tới cổng COM
const serialPort = new SerialPort(
  {
    path: "COM9",
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
  },
  function (err) {
    if (err) console.log("Lỗi", err.message);
    else console.log("OK");
  }
);

// Step 2: Đăng ký để lắng nghe mở cổng
serialPort.on("open", function () {
  console.log("-- Kết nối đã mở --");
  // Step 3: Kiểm tra gửi thông điệp tới HC05
  serialPort.write(message, function (err) {
    if (err) {
      console.log("Lỗi khi gửi: ", err.message);
      return serialPort.close();
    }
    console.log("Thông điệp gửi thành công");
  });

  // Step 4: Đăng ký lắng nghe dữ liệu trên cổng mở và xử lý khi nhận được
  serialPort.on("data", function (data) {
    str += data;
    result = data;
    console.log("Dữ liệu: " + data);
  });
});

// Middleware để ghi dữ liệu vào cơ sở dữ liệu khi relay được bật
function logRelayOn(req, res, next) {
  const currentTime = new Date().toISOString().slice(0, 19).replace("T", " "); // Lấy thời gian hiện tại

  const insertQuery = `INSERT INTO cdl_cambiendoam (relay_status, datetime) VALUES ('on', '${currentTime}')`; // Tạo truy vấn SQL INSERT

  connection.query(insertQuery, (err, results) => {
    if (err) {
      console.error("Lỗi khi chèn dữ liệu: ", err);
      return res.status(500).send("Lỗi khi chèn dữ liệu vào cơ sở dữ liệu");
    }
    console.log("Dữ liệu được chèn thành công");
    next(); // Chuyển sang middleware tiếp theo hoặc route chính
  });
}

// Routes
router.get("/", async function (req, res, next) {
  res.render("simpleGateway", { data: result });
});

router.get("/data", function (req, res, next) {
  const selectQuery = `SELECT id, relay_status, datetime FROM cdl_cambiendoam`; // Truy vấn SQL SELECT

  connection.query(selectQuery, (err, results) => {
    if (err) {
      console.error("Lỗi khi truy vấn dữ liệu: ", err);
      return res.status(500).send("Lỗi khi truy vấn dữ liệu từ cơ sở dữ liệu");
    }
    console.log("Dữ liệu được truy vấn thành công");
    res.json(results); // Trả về kết quả dưới dạng JSON
  });
});

router.get("/on", logRelayOn, function (req, res, next) {
  // Sử dụng middleware logRelayOn
  serialPort.write("1", function (err) {
    if (err) {
      return console.log("Lỗi khi ghi: ", err.message);
    }
    res.render("simpleGateway", { data: result });
  });
});

router.get("/off", function (req, res, next) {
  serialPort.write("0", function (err) {
    if (err) {
      return console.log("Lỗi khi ghi: ", err.message);
    }
    res.render("simpleGateway", { data: result });
  });
});

router.get("/auto", function (req, res, next) {
  serialPort.write("2", function (err) {
    if (err) {
      return console.log("Lỗi khi ghi: ", err.message);
    }
    res.render("simpleGateway", { data: result });
  });
});

router.delete("/data", function (req, res, next) {
  const deleteQuery = `DELETE FROM cdl_cambiendoam`; // Truy vấn SQL DELETE

  connection.query(deleteQuery, (err, results) => {
    if (err) {
      console.error("Lỗi khi xóa dữ liệu: ", err);
      return res.status(500).send("Lỗi khi xóa dữ liệu từ cơ sở dữ liệu");
    }
    console.log("Dữ liệu đã được xóa thành công");
    res.status(200).send("Dữ liệu đã được xóa thành công");
  });
});

module.exports = router;
