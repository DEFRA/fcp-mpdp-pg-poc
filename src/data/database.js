import { Signer } from '@aws-sdk/rds-signer'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { Sequelize, DataTypes, where, fn, col, and } from 'sequelize'

let sequelize
let SchemePaymentsModel
let PaymentDataModel
let PaymentDetailModel

async function register(server, options) {
  if (options.getTokenFromRDS) {
    options.hooks = {
      beforeConnect: async (config) => {
        config.password = await getToken(options)
      }
    }
  }

  sequelize = new Sequelize({
    username: options.user,
    password: options.passwordForLocalDev,
    host: options.host,
    port: options.port,
    dialect: options.dialect,
    database: options.database,
    dialectOptions: {
      ssl: server.secureContext || false
    },
    logging: (msg) => server.logger.info(msg),
    hooks: options.hooks || {},
    retry: {
      backOffBase: 1000,
      backOffExponent: 1.1,
      match: [/SequelizeConnectionError/],
      max: 10,
      name: 'connection',
      timeout: 60 * 1000
    }
  })

  defineModels()

  return sequelize
}

async function getToken(options) {
  const signer = new Signer({
    hostname: options.host,
    port: options.port,
    username: options.user,
    credentials: fromNodeProviderChain(),
    region: options.region
  })
  return await signer.getAuthToken()
}

function defineModels() {
  SchemePaymentsModel = sequelize.define('aggregate_scheme_payments', {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    financial_year: DataTypes.STRING(8),
    scheme: DataTypes.STRING(64),
    total_amount: DataTypes.DOUBLE
  })

  PaymentDataModel = sequelize.define('payment_activity_data', {
    payee_name: DataTypes.STRING(32),
    part_postcode: DataTypes.STRING(8),
    town: DataTypes.STRING(32),
    county_council: DataTypes.STRING(64),
    amount: DataTypes.DOUBLE
  })

  PaymentDetailModel = sequelize.define('payment_activity_data', {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    payee_name: DataTypes.STRING(128),
    part_postcode: DataTypes.STRING(8),
    town: DataTypes.STRING(128),
    county_council: DataTypes.STRING(64),
    financial_year: DataTypes.STRING(8),
    parliamentary_constituency: DataTypes.STRING(64),
    scheme: DataTypes.STRING(64),
    scheme_detail: DataTypes.STRING(128),
    amount: DataTypes.DOUBLE
  })
}

async function healthCheck() {
  await sequelize.authenticate()
}

async function getAnnualPayments() {
  return SchemePaymentsModel.findAll({
    attributes: ['scheme', 'financial_year', 'total_amount'],
    raw: true
  })
}

async function getPayeePayments(payeeName, partPostcode) {
  return PaymentDetailModel.findAll({
    group: [
      'financial_year',
      'payee_name',
      'part_postcode',
      'town',
      'county_council',
      'parliamentary_constituency',
      'scheme',
      'scheme_detail'
    ],
    attributes: [
      'financial_year',
      'payee_name',
      'part_postcode',
      'town',
      'county_council',
      'parliamentary_constituency',
      'scheme',
      'scheme_detail',
      [sequelize.fn('sum', sequelize.col('amount')), 'amount']
    ],
    where: and(
      where(fn('btrim', col('payee_name')), payeeName),
      where(fn('btrim', col('part_postcode')), partPostcode)
    )
  })
}

async function getAllPayments() {
  const payments = await PaymentDataModel.findAll({
    group: [
      'payee_name',
      'part_postcode',
      'town',
      'county_council',
      'scheme',
      'financial_year'
    ],
    attributes: [
      'payee_name',
      'part_postcode',
      'town',
      'county_council',
      'scheme',
      'financial_year',
      [sequelize.fn('sum', sequelize.col('amount')), 'total_amount']
    ],
    raw: true
  })
  return payments
}

async function getAllPaymentsByPage(page = 1, pageSize = 250) {
  return PaymentDataModel.findAll({
    group: [
      'payee_name',
      'part_postcode',
      'town',
      'county_council',
      'scheme',
      'financial_year',
      'scheme_detail'
    ],
    attributes: [
      'payee_name',
      'part_postcode',
      'town',
      'county_council',
      'scheme',
      'financial_year',
      'scheme_detail',
      [sequelize.fn('sum', sequelize.col('amount')), 'total_amount']
    ],
    raw: true,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    order: [['payee_name', 'ASC']]
  })
}

export {
  register,
  SchemePaymentsModel,
  PaymentDataModel,
  PaymentDetailModel,
  getAnnualPayments,
  getPayeePayments,
  getAllPayments,
  getAllPaymentsByPage,
  healthCheck
}
