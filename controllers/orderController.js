const OrderModel = require('../models/orderModel');
const CartonModel =  require('../models/cartonModels');
const parcelModel = require('../models/parcelModel');
const PreAlertModel = require('../models/preAlertModel');
const jwt = require("jsonwebtoken");

const hashDecode = (token) => {
    const secretKey = "password";
    const decorde = jwt.verify(token, secretKey);
    return decorde;
}

const createOrder = async (req, res) => {
    const hasedObject = hashDecode(req.body.data);
    const { order, parcel_list } = hasedObject.data;
    let next_carrier_info = "";
    let pre_carrier_info = "";
    const { 
            unique_id, 
            ilh_shopee_no, 
            carrier_tn, 
            carton_no,
            carton_weight,
            carton_length,
            carton_width,
            carton_height,
            carton_volume,
            goods_type, 
            service_code,
            transport_type, 
            destination_region,
            destination_region_name,
            sender,
            receiver,
            parcel_qty } = order;

    try {
        if( !unique_id || 
            !ilh_shopee_no || 
            !carton_no || 
            !carton_weight || 
            !goods_type || 
            !service_code || 
            !transport_type || 
            !destination_region || 
            !destination_region_name || 
            !sender || 
            !receiver || 
            !parcel_qty ||
            !carton_no ||
            !carton_weight )  {
            return res.status(400).json({
                "retcode": -1200012,
                "message": "please check the field",
                "data": ""
            });
        }
        
        if (order.pre_carrier_info) {
            let { carrier_code, carrier_name } = order.pre_carrier_info;
            if(!carrier_code || !carrier_name){
                return res.status(400).json({
                    "retcode": -1200012,
                    "message": "please check the field",
                    "data": ""
                });
            }
            pre_carrier_info = order.pre_carrier_info
        }
        
        if(order.next_carrier_info) {
            let { carrier_code, carrier_name } = order.next_carrier_info;
            if(!carrier_code || !carrier_name) {
                return res.status(400).json({
                    "retcode": -1200012,
                    "message": "please check the field",
                    "data": ""
                });
            }
            next_carrier_info = order.next_carrier_info;
        }
        if (unique_id) {
                const duplicate = await OrderModel.findOne({"unique_id": unique_id});
                if (duplicate){
                    return res.status(400).json({
                        "retcode": -1200012,
                        "message": "Duplicated order id",
                        "data": ""
                    });
                }
        }

        const newCarton = {
            carton_no: carton_no,
            carton_height: carton_height,
            carton_length: carton_length,
            carton_weight: carton_weight,
            carton_width: carton_width,
            carton_volume: carton_volume,
            destination_region: destination_region,
        }

        const saveCarton = new CartonModel(newCarton);
        const  carton = await saveCarton.save();
        const newOrder = {
            unique_id: unique_id,
            carton_id: carton._id,
            ilh_shopee_no: ilh_shopee_no,
            carrier_tn: carrier_tn,
            goods_type: goods_type,
            service_code: service_code,
            transport_type: transport_type,
            destination_region_name: destination_region_name,
            destination_region: destination_region,
            pre_carrier_info: pre_carrier_info,
            next_carrier_info: next_carrier_info,
            sender: sender,
            receiver: receiver,
            parcel_qty: parcel_qty,
            parcel_list: parcel_list
        }
        const saveOrder = new OrderModel(newOrder);
        await saveOrder.save();
        res.status(201).json({
            "retcode": 0,
            "message": "Save successed!",
            "data": {
                "carrier_tn": carrier_tn
            }
        }) 

    } catch (error) {
        console.log("create order error", error);
        res.status(500).json({message: "Something went wrong"});
    }
}

const updateOrder = async (req, res) => {
    const hasedObject = hashDecode(req.body.data);
    const { order, parcel_list } = hasedObject.data;
    const { 
        unique_id, 
        ilh_shopee_no, 
        carrier_tn, 
        carton_weight,
        carton_length,
        carton_width,
        carton_height,
        carton_volume,
        goods_type, 
        service_code,
        pre_carrier_info,
        next_carrier_info,      
        sender,
        receiver,
        parcel_qty } = order;
    try {
        if( !unique_id || 
            !ilh_shopee_no || 
            !carrier_tn || 
            !carton_weight || 
            !goods_type || 
            !service_code || 
            !sender || 
            !receiver || 
            !parcel_qty ||
            !carton_weight )  {
            return res.status(400).json({
                "retcode": -1200012,
                "message": "please check the field",
                "data": ""
            });
        }

        const renewOrder =  await OrderModel.findOne({"unique_id": unique_id});
        if(!renewOrder){
            return res.status(400).json({
                "retcode": -1200013,
                "message": `There is no Order with ${unique_id} id.`,
                "data": ""
            })
        } else {
            CartonModel.populate(renewOrder, { path: 'carton_id'}, (err, populatedOrder) => {
                if(err){
                    return res.status(400).json({
                        "retcode": -1200012,
                        "message": err
                    })
                } else {
                   populatedOrder.carton_id.carton_weight = carton_weight;
                   populatedOrder.carton_id.carton_length = carton_length;
                   populatedOrder.carton_id.carton_width = carton_width;
                   populatedOrder.carton_id.carton_height = carton_height;
                   populatedOrder.carton_id.carton_volume = carton_volume;
                   populatedOrder.carton_id.save();
                }
            
            })
        }
        renewOrder.ilh_shopee_no = ilh_shopee_no;
        renewOrder.goods_type = goods_type;
        renewOrder.service_code = service_code;
        renewOrder.pre_carrier_info = pre_carrier_info;
        renewOrder.next_carrier_info = next_carrier_info;
        renewOrder.sender = sender;
        renewOrder.receiver = receiver;
        renewOrder.parcel_qty = parcel_qty;
        renewOrder.parcel_list = parcel_list;

        const update_order = await renewOrder.save();
        return res.status(200).json({
            "retcode": 0,
            "message": "The order was updated"
        });
    } catch(error) {
        res.status(500).json({ 
            "retcode": -1200013,
            "message":  error })
    }
}

const cancelOrder = async (req, res) => {
    const hasedObject = hashDecode(req.body.data);
    const { unique_id, carrier_tn } = hasedObject.data;
    try {
        if (!unique_id || !carrier_tn){
            return res.status(400).json({
                "retcode": -1200012,
                "message": "please check the field",
            });
        }
       
       OrderModel.findOne({"unique_id": unique_id}, (err, order) => {
        if(!order){
            return res.status(400).json({
                "retcode": -1200012,
                "message": `There is no order with ${unique_id} id`
            })
        } else {
             CartonModel.deleteOne({"_id": order.carton_id}, async (err) => {
                
                if (err){
                    console.log(err);
                } else {
                    await OrderModel.deleteOne({"_id": order._id});

                    console.log(order._id);
                    res.status(200).json({
                        "retcode": 0,
                        "message": "The order is deleted",
                    })
                }
            });
        }
       });       
    } catch(error) {
        res.status(500).json({
            "retcode": -1200013,
            "message":  error
        })
    }
}
const parcelInfo = async (req, res) => {

    const hasedObject = hashDecode(req.body.data);
    const { order, parcel_list } = hasedObject.data;
    const { ilh_shopee_no, carrier_tn } = order;
    console.log("ilh_shopee_no", ilh_shopee_no);
    try{
        const newOrder = await OrderModel.findOne({"ilh_shopee_no": ilh_shopee_no});
        console.log(newOrder);
        if (!newOrder){
            return res.status(400).json({
                "retcode": -1200013,
                "message":  `There is no Order with ${ilh_shopee_no}.`,
                "data": ""
            });
        }
        parcel_list.map((parcel) => {
            let flag = 0;
            console.log("parcel", parcel);
            for (let index = 0; index < newOrder.parcel_list.length; index++) {                
                if (parcel.reference_no == newOrder.parcel_list[index]) {
                    const newParcel =  new parcelModel(parcel);
                    const saveParcel =  newParcel.save();
                    res.status(201).json({
                        "retcode": 0,
                        "message": "Received parcel info"
                    });
                    flag++;
                }
                
            }
            if(flag == 0) {
               return res.status(400).json({
                "retcode": -1200013,
                "message": `There is no parcel with ${parcel.reference_no} in this order` 
                })
            }
        })
    } catch(error) {
        res.status(500).json({
            "retcode": -1200013,
            "message": error
        })
    }
}
const preAlert = async (req, res) => {
    const hasedObject = hashDecode(req.body.data);
    const {
        lading_bill,
        action_type,
        departure_location,
        arrival_location,
        lading_bill_vol_weight,
        lading_bill_chargeable_weight,
        lading_bill_sequence,
        lading_bill_total_number,
        etd,
        eta,
        transport_company_name,
        vessel_no,
        carton_list
    } = hasedObject.data;

    try {
        if( !lading_bill ||
            !action_type ||
            !departure_location ||
            !arrival_location ||
            !lading_bill_vol_weight ||
            !lading_bill_chargeable_weight ||
            !lading_bill_sequence ||
            !lading_bill_total_number ||
            !eta ||
            !etd ||
            !transport_company_name ||
            !vessel_no ||
            !carton_list){
                return res.status(400).json({
                    "retcode": "-1200012",
                    "message": "Please check input field"
                });
            }
        const newPreAlert = new PreAlertModel(req.body);
        await newPreAlert.save();
        res.status(200).json({
            "retcode": 0,
            "message": "Received pre-alert info!"
        })

    } catch (error) {
        res.status(500).json({
            "retcode": -1200013,
            "message": error
        })
    }
}
module.exports = { createOrder, updateOrder, cancelOrder, parcelInfo, preAlert};                                       