const fs = require("fs");
let js = fs.readFileSync("src/main.js", "utf8");

const dangling = `    import("./views/contacts.js").then(m => m.showContactsModal("employee"));
  });
}
      });
    });
  });
}`;

const fix = `    import("./views/contacts.js").then(m => m.showContactsModal("employee"));
  });
}`;

js = js.replace(dangling, fix);

fs.writeFileSync("src/main.js", js);
console.log("Fixed dangling syntax error!");
