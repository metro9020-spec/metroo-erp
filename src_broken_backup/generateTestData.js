import { state } from './state.js';
export function attachGenerateTestDataListener() {

  document.getElementById("btn-generate-test").addEventListener("click", () => {
    if(!confirm("Are you sure you want to generate 5 test products, vendors, customers, sales, purchases, and vouchers?")) return;
    
    // 1. Create Products
    const products = [];
    for(let i=1; i<=5; i++) {
        const id = state.generateNextMaterialId();
        const prod = {
            id: id,
            name: "Test Product " + i,
            code: "PROD" + i,
            unit: "PCS",
            hsnCode: "1234",
            landingCost: 100 * i,
            purchaseRate: 100 * i,
            mrp: 150 * i,
            retailRate: 140 * i,
            wholesaleRate: 130 * i,
            cgst: 9,
            sgst: 9,
            igst: 18,
            cess: 0,
            stock: 0,
            batches: []
        };
        state.materials.push(prod);
        products.push(prod);
    }
    
    // 2. Create Vendors (Outside State for IGST, inside for Local)
    const vendors = [];
    for(let i=1; i<=5; i++) {
        const id = state.generateNextContactId();
        const vendor = {
            id: id,
            name: "Test Vendor " + i,
            type: "supplier",
            phone: "999999999" + i,
            state: i % 2 === 0 ? "KERALA" : "TAMIL NADU", // Assuming company is KERALA
            gstin: "32XXXXX1234X1Z" + i,
            balance: 0,
            listInVendorList: true
        };
        state.contacts.push(vendor);
        vendors.push(vendor);
    }

    // 3. Create Customers (Outside State for IGST, inside for Local)
    const customers = [];
    for(let i=1; i<=5; i++) {
        const id = state.generateNextContactId();
        const customer = {
            id: id,
            name: "Test Customer " + i,
            type: "customer",
            phone: "888888888" + i,
            state: i % 2 === 0 ? "KERALA" : "KARNATAKA",
            gstin: "29XXXXX1234X1Z" + i,
            balance: 0,
            listInCustomerList: true
        };
        state.contacts.push(customer);
        customers.push(customer);
    }

    // 4. Create Local Purchases
    state.recordPurchase({
        supplierId: vendors[1].id, // Kerala Vendor
        date: new Date().toISOString().split("T")[0],
        payMode: "Credit",
        state: "KERALA",
        items: [
            { materialId: products[0].id, name: products[0].name, quantity: 10, price: 100, gstPercent: 18, gstAmount: 180, amount: 1000 }
        ],
        subtotal: 1000,
        total: 1180,
        roundOff: 0
    });

    // 5. Create IGST Purchases
    state.recordPurchase({
        supplierId: vendors[0].id, // Non-Kerala Vendor
        date: new Date().toISOString().split("T")[0],
        payMode: "Credit",
        state: "TAMIL NADU",
        items: [
            { materialId: products[1].id, name: products[1].name, quantity: 5, price: 200, gstPercent: 18, gstAmount: 180, amount: 1000 }
        ],
        subtotal: 1000,
        total: 1180,
        roundOff: 0
    });

    // 6. Create No-Tax Purchase
    state.recordPurchase({
        supplierId: vendors[1].id,
        date: new Date().toISOString().split("T")[0],
        payMode: "Credit",
        state: "KERALA",
        items: [
            { materialId: products[2].id, name: products[2].name, quantity: 5, price: 300, gstPercent: 0, gstAmount: 0, amount: 1500 }
        ],
        subtotal: 1500,
        total: 1500,
        roundOff: 0
    });

    // 7. Create Local Sales
    state.saveInvoice({
        contactId: customers[1].id, // Kerala Customer
        date: new Date().toISOString().split("T")[0],
        payMode: "Credit",
        state: "KERALA",
        items: [
            { materialId: products[0].id, name: products[0].name, quantity: 2, price: 150, gstPercent: 18, gstAmount: 54, amount: 300 }
        ],
        subtotal: 300,
        total: 354,
        roundOff: 0
    });

    // 8. Create IGST Sales
    state.saveInvoice({
        contactId: customers[0].id, // Non-Kerala Customer
        date: new Date().toISOString().split("T")[0],
        payMode: "Credit",
        state: "KARNATAKA",
        items: [
            { materialId: products[1].id, name: products[1].name, quantity: 1, price: 250, gstPercent: 18, gstAmount: 45, amount: 250 }
        ],
        subtotal: 250,
        total: 295,
        roundOff: 0
    });

    // 9. Create No-Tax Sales
    state.saveInvoice({
        contactId: customers[1].id,
        date: new Date().toISOString().split("T")[0],
        payMode: "Credit",
        state: "KERALA",
        items: [
            { materialId: products[2].id, name: products[2].name, quantity: 1, price: 350, gstPercent: 0, gstAmount: 0, amount: 350 }
        ],
        subtotal: 350,
        total: 350,
        roundOff: 0
    });

    // 10. Receipt & Payment
    state.addVoucher({
        type: "receipt",
        date: new Date().toISOString().split("T")[0],
        amount: 354,
        creditAccount: customers[1].id,
        debitAccount: "1010",
        description: "Receipt from Customer 2"
    });
    
    state.addVoucher({
        type: "payment",
        date: new Date().toISOString().split("T")[0],
        amount: 1180,
        creditAccount: "1010",
        debitAccount: vendors[1].id,
        description: "Payment to Vendor 2"
    });

    // 11. Contra
    state.addVoucher({
        type: "contra",
        date: new Date().toISOString().split("T")[0],
        amount: 500,
        creditAccount: "1010", // Cash
        debitAccount: "1020", // Bank
        description: "Cash deposited to Bank"
    });

    state.saveState();
    alert("Test data generated successfully! Please refresh the page to see everything.");
    window.location.reload();
  });
}