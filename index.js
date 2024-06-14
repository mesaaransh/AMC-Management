const express = require('express')
const ejs = require("ejs")
const bodyParser = require("body-parser")
const mongoose = require("mongoose")
const { v4: uuidv4 } = require('uuid')
require('dotenv').config()

const app = express()
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static("public"))
app.set('view engine', 'ejs')

mongoose.set('strictQuery', false);
mongoose.connect('mongodb+srv://mesaaransh:' + process.env.pass + '@cluster0.mfqfmwp.mongodb.net/duesnpays').then(() => { console.log("DBCON"); })


const companySchama = new mongoose.Schema({
    _id: { type: String, unique: true },
    compName: String,
    description: String,
    phone: String,
    addDate: Date,
})

const peridueSchema = new mongoose.Schema({
    compId: String,
    currDate: Date,
    dueDate: Date,
    endDate: { type: Date, default: null },
    duration: Number,
    unit: Number,
    ammount: Number,
    description: {
        type: String,
        default: ""
    },
})

const paymentSchema = new mongoose.Schema({
    compId: String,
    currDate: Date,
    dueDate: {
        type: Date,
        default: function () { return (this.currDate) }
    },
    ammount: Number,
    description: {
        type: String,
        default: ""
    },
    mode: {
        type: Number,
        default: 0
    }
})

const peridueTable = mongoose.model("periDue", peridueSchema)
const paymentTable = mongoose.model("payment", paymentSchema)
const companytable = mongoose.model("company", companySchama)










app.get("/", function (req, res) {
    res.redirect("/due")

})






//Company Routes
app.get("/companyadd", async function (req, res) {
    try {

        var editId = req.query.editid;
        var redir = req.query.redir ? req.query.redir : "";

        if(editId){
            var company = await companytable.findById(editId)
            res.render("./pages/companyadd.ejs", {company, redir, editId})
        }
        else{
            var company = {}
            res.render("./pages/companyadd.ejs", {company, redir, editId})
        }
    } catch (error) {
        res.send(error)
    }
})

app.post("/companyadd", async function (req, res) {

    try {

        var editId = req.query.editid;
        if(editId){
            await companytable.findOneAndUpdate(editId, req.body)
        }
        else{
            let date = new Date()
            var newcompany = new companytable({
                ...req.body,
                _id: uuidv4(),
                addDate: date
            })
            await newcompany.save()
        }

        res.redirect("/companyadd")

    } catch (error) {
        res.send(error)
    }

})

















//Due Routes
app.get("/due", async function (req, res) {

    try {

        var companies = await companytable.find({}, '_id compName');
        var companyId = req.query.from;
        var editId = req.query.editid;
        var redir = req.query.redir ? req.query.redir : "";

        if (editId) {
            var prevDue = await peridueTable.findById(editId);
            companyId = prevDue.compId;
            res.render("./pages/due", { companies, companyId, prevDue, redir });
        }
        else {
            var prevDue = {};
            res.render("./pages/due", { companies, companyId, prevDue, redir });
        }

    } catch (error) {
        res.send(error)
    }

})

app.post("/due", async function (req, res) {

    let date = new Date()
    const data = {
        ...req.body,
        currDate: date
    };

    try {
        var editId = req.query.editid

        if (editId) {
            await peridueTable.findByIdAndUpdate(editId, data);
            res.redirect('/info/' + req.query.redir);
        }
        else {

            if (data.unit != 0) {

                const newdue = new peridueTable(data);
                await newdue.save();

            }
            else {

                if (data.endDate.length == 0) {
                    data.endDate = new Date(data.dueDate);
                }
                const newdue = new peridueTable(data);
                await newdue.save();

            }

            if (redir) {
                res.redirect('/info/' + req.query.redir);
                return;
            }
            else {
                res.redirect('/due');
                return;
            }
        }
    } catch (error) {
        res.send(error);
    }

})

app.get("/enddue/:id", async function (req, res) {

    try {

        const id = req.params.id
        var date = new Date();
        await peridueTable.findByIdAndUpdate(id, {
            endDate: date
        })

        res.redirect('back')

    } catch (error) {
        res.send(error)
    }

})

app.get("/deldue/:id", async function (req, res) {

    try {

        const id = req.params.id
        await peridueTable.findByIdAndDelete(id)
        res.redirect('back')

    } catch (error) {
        res.send(error)
    }

})
















//Payment Routes
app.get("/payment", async function (req, res) {

    try {

        var companies = await companytable.find({}, '_id compName');
        var companyId = req.query.id;
        var editId = req.query.editid;

        if (editId) {
            var prevPay = await paymentTable.findById(editId);
            companyId = prevPay.compId;
            res.render("./pages/payment", { companies, companyId, prevPay })
        }
        else {
            var prevPay = {};
            res.render("./pages/payment", { companies, companyId, prevPay })
        }

    } catch (error) {
        res.send(error)
    }

})

app.post("/payment", async function (req, res) {

    let date = new Date()
    const data = {
        ...req.body,
        currDate: date
    };

    try {

        var editId = req.query.editid;
        if (editId) {
            await paymentTable.findByIdAndUpdate(editId, data);
            res.redirect('back')
        }
        else {
            const newpay = new paymentTable(data);
            await newpay.save();
            res.redirect("/payment");
        }


    } catch (error) {
        res.send("error")
    }

})

app.get("/delpayment/:id", async function (req, res) {

    try {
        var id = req.params.id;
        await paymentTable.findByIdAndDelete(id);
        res.redirect('back');

    } catch (error) {
        res.send(error)
    }

})










//search routes
app.get("/search", async function (req, res) {

    try {

        var date = req.query.date;
        if (!date) date = new Date();

        var data = await searchPageEntries(date);
        res.render('./pages/search', { data })
    } catch (error) {
        res.send(error)
    }

})





//Report Routes
app.get("/report/:id", async function (req, res) {

    try {
        let compId = req.params.id
        var data = await companyPageEntries(compId)
        res.render('./pages/report', { data })

    } catch (error) {
        res.send(error)
    }

})





//info Routes

app.get("/info/:id", async function (req, res) {

    try {
        var compId = req.params.id;
        var company = await companytable.findById(compId);
        var payments = await paymentTable.find({ compId: compId });
        var dues = await peridueTable.find({ compId: compId });
        res.render('./pages/companyInfo', { company, payments, dues })

    } catch (error) {
        res.send(error)
    }

})
































async function searchPageEntries(date) {

    var companies = await companytable.find({});
    var payments = await paymentTable.find({});
    var dues = await peridueTable.find({});
    var inDate = new Date(date)

    var res = [];

    for (var i = 0; i < companies.length; i++) {

        var companyDetails = {
            compId: companies[i]._id,
            compName: companies[i].compName,
            entries: [],
            totalDues: 0,
            totalPays: 0
        };

        var newPayments = payments.filter((e) => (e.compId == companies[i]._id));
        var newDues = dues.filter((e) => (e.compId == companies[i]._id));

        //Dues
        for (var j = 0; j < newDues.length; j++) {

            if (newDues[j].endDate == null) {
                newDues[j].endDate = inDate;
            }

            var startDate = newDues[j].dueDate;
            var endDate = Math.min(newDues[j].endDate, inDate);
            var dueEntries = [];
            totalDues = 0;

            if (inDate > startDate) {
                //initial date push
                dueEntries.push({
                    date: startDate,
                    description: newDues[j].description,
                    ammount: newDues[j].ammount
                });
                totalDues += newDues[j].ammount;
            }

            while (startDate < endDate) {

                var entry = {
                    date: new Date(startDate),
                    description: newDues[j].description,
                    ammount: newDues[j].ammount
                };

                startDate.setFullYear(startDate.getFullYear() + 1);
                dueEntries.push(entry);
                totalDues += newDues[j].ammount;

            }

            dueEntries = dueEntries.filter((e) => {
                if (e.date > inDate) {
                    totalDues -= newDues[j].ammount;
                }
                return e.date < inDate;
            });

            companyDetails.entries = [...companyDetails.entries, ...dueEntries];
            companyDetails.totalDues += totalDues;
        }

        //Payments
        for (var j = 0; j < newPayments.length; j++) {

            var paymentDetails = [];
            var totalPays = 0;

            var entry = {
                date: newPayments[j].dueDate,
                description: newPayments[j].description,
                ammount: newPayments[j].ammount * -1
            };

            paymentDetails.push(entry);
            totalPays += newPayments[j].ammount;

            companyDetails.entries = [...companyDetails.entries, ...paymentDetails];
            companyDetails.totalPays = totalPays;

        }

        companyDetails.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
        res.push(companyDetails);
    }

    return res;

}

async function companyPageEntries(id) {

    var companies = await companytable.findById(id);
    var newPayments = await paymentTable.find({ compId: id });
    var newDues = await peridueTable.find({ compId: id });

    var res = [];

    var companyDetails = {
        compId: id,
        compName: companies.compName,
        entries: [],
        totalDues: 0,
        totalPays: 0
    };

    //Dues
    for (var j = 0; j < newDues.length; j++) {

        if (newDues[j].endDate == null) {
            newDues[j].endDate = new Date();
        }

        var startDate = newDues[j].dueDate;
        var endDate = newDues[j].endDate;
        var dueEntries = [];
        totalDues = 0;

        //initial date push
        dueEntries.push({
            date: startDate,
            description: newDues[j].description,
            ammount: newDues[j].ammount
        });
        totalDues += newDues[j].ammount;

        while (startDate < endDate) {

            var entry = {
                date: new Date(startDate),
                description: newDues[j].description,
                ammount: newDues[j].ammount
            };

            startDate.setFullYear(startDate.getFullYear() + 1);
            dueEntries.push(entry);
            totalDues += newDues[j].ammount;

        }

        dueEntries = dueEntries.filter((e) => {
            if (e.date > new Date()) {
                totalDues -= newDues[j].ammount;
            }
            return e.date < new Date();
        });

        companyDetails.entries = [...companyDetails.entries, ...dueEntries];
        companyDetails.totalDues += totalDues;
    }

    //Payments
    for (var j = 0; j < newPayments.length; j++) {

        var paymentDetails = [];
        var totalPays = 0;

        var entry = {
            date: newPayments[j].dueDate,
            description: newPayments[j].description,
            ammount: newPayments[j].ammount * -1
        };

        paymentDetails.push(entry);
        totalPays += newPayments[j].ammount;

        companyDetails.entries = [...companyDetails.entries, ...paymentDetails];
        companyDetails.totalPays = totalPays;

    }

    companyDetails.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    res.push(companyDetails);

    return res;

}


app.listen(8000, () => { console.log("----------AppStarted-----------"); })