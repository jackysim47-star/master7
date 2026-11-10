import {ProviderTransferError,launchTransferWallet,settleTransferWallet,recoverTransferWallet,readMemberTransferWallet,adminTransferWalletRecords,type ProviderTransferContext} from './provider-transfer-wallet.ts';
import {gameTransferRuntime,seedTransferProfile,transferProfileSupported} from './game-provider-runtime.ts';
import type {MegaSessionCloser,MegaAcceptanceCapabilities} from './mega-session-closure.ts';
import {authorizeDepositIncidentRead} from './deposit-incident-evidence.ts';
import {createHash,timingSafeEqual} from 'node:crypto';
import {getGameCatalogue,cachedGameArtwork,gameControlSourceIds,configuredGameCatalogueSourceIds,configuredGameCatalogueCacheKeys,defaultGameCatalogueCacheKey,gameCatalogueProfileCacheKey,gameCatalogueCacheFresh} from './game-catalogue.ts';
import { readLocalSession, handlePasswordAuth, AuthError, changeLocalUserRole } from './password-auth.ts';
import { requestOriginAllowed } from './request-origin.ts';
import {createVPayOrder,readVPayDepositProviderEvidence,handleVPay,vpayOrdersConfigured,vpayRemoteOrderReady,refreshVPayOrder,recoverVPayDeposits,vpayCapabilitySnapshot} from './vpay.ts';
import {handleVPayPayoutCallback,recoverVPayPayouts,submitVPayPayout,vpayPayoutAvailability,vpayPayoutSupportsBank} from './vpay-payout.ts';
import {createOneMpayOrder,readOneMpayDepositProviderEvidence,handleOneMpay,refreshOneMpayOrder,recoverOneMpayDeposits,oneMpayCapabilitySnapshot} from './onempay.ts';
import {automaticDepositCapability,automaticPaymentStatus} from './payment-capabilities.ts';
import {createGSPayOrder,gspayProgramConfigured,handleGSPay,handleGSPayCallback,refreshGSPayOrder,recoverGSPayDeposits,recoverGSPayPayouts,queryGSPayBalance,gspayCapabilitySnapshot,gspayPayoutAvailability,submitGSPayPayout} from './gspay.ts';
import {gspayUsdtCapabilitySnapshot,handleGSPayUsdtStatus} from './gspay-usdt.ts';
import {approveWithdrawal,cancelWithdrawal,getWithdrawalBanks,listAdminWithdrawals,listMemberWithdrawals,submitWithdrawal} from './withdrawals.ts';
import {manualBankPayoutGet,manualBankPayoutPost} from './manual-bank-payouts.ts';
import { manualBankGet, manualBankPost,manualBankAvailability } from './manual-bank.ts';
import {MegaWalletError,adminMegaWalletSessions,megaLaunchOriginAllowed,megaWalletCapabilities,megaWalletConfigured,memberMegaWalletState,prepareMegaWallet,recoverMegaWallet,settleMegaWallet,claimMegaLaunch,markMegaLaunchIssued,markMegaLaunchUnknown,type MegaWalletContext,type MegaWalletCapability} from './megah5-wallet.ts';
import {adminProfileGameWallets,memberProfileGameWallet} from './game-wallet-records.ts';
import {BACKUP_FORMAT,BACKUP_SCHEMA_SHA256,BACKUP_SCHEMA_VERSION,BACKUP_TABLES} from './encrypted-backup.ts';
import {BACKUP_PUBLIC_KEY_SHA256} from './backup-public-key.ts';
import {BackupOperationsError,createPortalBackup,latestEncryptedBackupAudit,recordPortalRestoreRehearsal} from './backup-operations.ts';
import {ACCOUNTING_REPORT_TYPE,accountingSnapshot,previousMytDayStart,runAccountingCatchUp,settledCashflow,mytDateStart} from './accounting.ts';
import {financeCenterReport} from './finance-center.ts';
import {operationsIntelligenceReport,operationsWindow} from './operations-intelligence.ts';
import {BonusRiskError,bonusRiskReport,saveBonusRiskConfig,type BonusRiskSeverity} from './bonus-risk.ts';
import {EngagementError,getAdminEngagement,getPublicEngagement,saveEngagementProgram} from './engagement.ts';
import {ResponsiblePlayError,assertResponsiblePlayGameLaunch,depositAmountMinor,finalizeResponsiblePlayDeposit,getResponsiblePlay,reserveResponsiblePlayDeposit,responsiblePlayAdminStats,responsiblePlayMarketingAllowedSql,updateResponsiblePlay} from './responsible-play.ts';
import {ManualComplianceError,getManualCompliance,requestManualCompliance,reviewManualCompliance,authorizeManualComplianceAction} from './manual-compliance.ts';
import {GAME_PROVIDER_IDS,GAME_PROVIDER_NAMES,GameRankingError,getGameRanking,getPublicGameRanking,loadGameRanking,rankPlatforms,saveGameRanking} from './game-ranking.ts';
import {GAME_PROVIDER_PROFILES,getGameProviderProfile,getGameProviderProfiles,type RegisteredGameProviderProfile} from './game-provider-registry.ts';
import {GameProviderAcceptanceError,getGameProviderAcceptance,getGameProviderAcceptanceReadiness,recordGameProviderAcceptance} from './game-provider-acceptance.ts';
import {getJdbWagerCoverage,JdbWagerCoverageError} from './jdb-wager-coverage.ts';
import {ProductionAcceptanceError,getProductionAcceptance,getProductionAcceptanceReadiness,recordProductionAcceptance} from './production-acceptance.ts';
import {RewardStateError,createBlockedBenefitClaim,getBenefitClaimByRequest,listBenefitClaims,listCommissionEntries,listCommissionPeriods,persistCommissionPreview} from './reward-state.ts';
import {VipError,getAdminVip,getPublicVip,saveVipProgram,vipProgramStatus} from './vip.ts';
import {RewardsHubError,checkInRewardsHub,getAdminRewardsHub,getRewardsHub,saveRewardsHubProgram} from './rewards-hub.ts';
import {generateSupportReply,SUPPORT_ASSISTANT_NAME,supportAiProviderStatus,type SupportAiConfig} from './support-ai.ts';
import {sendTelegramAdminTest,telegramAdminStatus} from './telegram-admin.ts';
import {type WhatsAppBusinessContext} from './whatsapp-business.ts';
import {applyWhatsAppWebhook,authorizeWhatsAppWorker,dispatchWhatsAppCampaigns,launchWhatsAppCampaign,WhatsAppCampaignError,whatsappCampaignStatus,whatsappWebhookChallenge,type WhatsAppCampaignContext} from './whatsapp-campaign.ts';
export const RELEASE = '17.0.0-selfbuilt.173-staff-setup-route';
export const SOURCE_RELEASE = RELEASE;
const CUSTOMER_ORIGIN='https://www.master7.best';
const MARKETING_CONTACT_LIMIT=1_000_000;
type Identity={userId:string;email:string};
type User={id:string;username:string;role:string;approved:number;csrf:string;created_at:number};
type FinancialEventType='deposit'|'manual_bank'|'withdrawal';
type FinancialEventCursor={createdAt:number;type:FinancialEventType;id:string};
const depositControlProviders=['vpay','gspay','1mpay','manual_bank'] as const;
type DepositControlProvider=typeof depositControlProviders[number];
async function depositControls(db:D1Database){
 const result=await db.prepare("SELECT id,value FROM settings WHERE id IN ('deposit_control:vpay','deposit_control:gspay','deposit_control:1mpay','deposit_control:manual_bank')").all<{id:string;value:string}>();
 if(!result||!Array.isArray(result.results))throw new ApiError(503,'Deposit controls unavailable');
 const values=new Map(result.results.map(row=>[row.id,row.value]));
 return Object.fromEntries(depositControlProviders.map(provider=>{const key='deposit_control:'+provider,value=values.get(key);return [provider,!values.has(key)||value==='auto'?'auto':'paused'];})) as Record<DepositControlProvider,'auto'|'paused'>;
}
export type Context={db:D1Database;identity:Identity|null;ownerEmail:string;manualComplianceEnforced?:string;newDepositsEnabled?:string;newGameLaunchesEnabled?:string;newPayoutsEnabled?:string;ownerLoginId?:string;allowedOrigins?:string[];gameGatewayUrl?:string;gameGatewayToken?:string;gameGatewayWalletToken?:string;megaLaunchOriginsJson?:string;jdbTransferProfilesJson?:string;gameTransferProfilesJson?:string;providerTransferFetch?:typeof fetch;megaTransfersEnabled?:string;megaLiveGamesEnabled?:string;megaSettlementVerified?:string;megaSessionCloser?:MegaSessionCloser;megaClosureContractVerified?:boolean;gameGatewayFetch?:typeof fetch;gameArtFetch?:typeof fetch;vpayGatewayUrl?:string;vpayOrderToken?:string;vpayQueryToken?:string;vpayCallbackToken?:string;vpayPayoutToken?:string;vpayPayoutEnabled?:string;vpayOrdersEnabled?:string;vpayMode?:string;vpayTraderId?:string;vpayReturnUrl?:string;vpayRecoveryEnabled?:string;vpayFetch?:typeof fetch;gspayApiBase?:string;gspayAuthKey?:string;gspaySecretKey?:string;gspayCallbackToken?:string;gspayOrdersEnabled?:string;gspayReturnUrl?:string;gspayRecoveryEnabled?:string;gspayBalanceEnabled?:string;gspayPayoutEnabled?:string;gspayPayoutIpWhitelistConfirmed?:string;gspayPayoutBankTargetsJson?:string;gspayUsdtApiBase?:string;gspayUsdtAuthKey?:string;gspayUsdtSecretKey?:string;gspayUsdtCallbackToken?:string;gspayUsdtOrdersEnabled?:string;gspayUsdtReturnUrl?:string;gspayUsdtCallbackUrl?:string;gspayUsdtRecoveryEnabled?:string;gspayUsdtBalanceEnabled?:string;gspayUsdtContractVerified?:string;gspayUsdtAssetNetwork?:string;gspayUsdtCurrencyScale?:string;gspayUsdtCheckoutOrigin?:string;paymentRecoveryToken?:string;backupJobToken?:string;depositIncidentTokenHash?:string;depositIncidentExpiresAt?:number;gspayFetch?:typeof fetch;ownerSetupHash?:string;ownerSetupExpires?:number;ownerResetHash?:string;ownerResetExpires?:number;ownerResetIssuedAt?:number;anchorApiBaseUrl?:string;anchorUsername?:string;anchorPassword?:string;anchorSenderId?:string;otpHashSecret?:string;smsFetch?:typeof fetch;withdrawalDataKey?:string;oneMpayApiBase?:string;oneMpayMerchant?:string;oneMpaySecretKey?:string;oneMpayOrdersEnabled?:string;oneMpayCallbackUrl?:string;oneMpayReturnUrl?:string;oneMpayDiagnosticToken?:string;oneMpayRecoveryEnabled?:string;oneMpayFetch?:typeof fetch;rectangleApiBase?:string;rectangleOperatorCode?:string;rectangleApiKey?:string;godeeApiBase?:string;godeeOperatorId?:string;godeeApiKey?:string;gameCatalogueFetch?:typeof fetch;gameSyncToken?:string;accountingJobToken?:string;telegramBotToken?:string;telegramAdminChatId?:string;telegramFetch?:typeof fetch;whatsappEnabled?:string;whatsappGraphApiVersion?:string;whatsappPhoneNumberId?:string;whatsappWabaId?:string;whatsappAccessToken?:string;whatsappAppSecret?:string;whatsappWebhookVerifyToken?:string;whatsappBusinessNumber?:string;whatsappTemplateName?:string;whatsappTemplateLanguage?:string;whatsappRecipientLimit?:string;whatsappWorkerToken?:string;whatsappWorkerBatchSize?:string;whatsappFetch?:typeof fetch;supportAiEnabled?:string;supportAiApiBaseUrl?:string;supportAiApiKey?:string;supportAiModel?:string;supportAiFetch?:typeof fetch};
function vpaySettings(c:Context,user:User|null,acceptance?:{realPaymentVerified:boolean;settlementVerified:boolean}){return {...vpayPayoutSettings(c),user,orderToken:c.vpayOrderToken,queryToken:c.vpayQueryToken,enabled:c.vpayOrdersEnabled,newDepositsEnabled:c.newDepositsEnabled,mode:c.vpayMode,portalOrigins:c.allowedOrigins,returnUrl:c.vpayReturnUrl,recoveryEnabled:c.vpayRecoveryEnabled,acceptance};}
function vpayPayoutSettings(c:Context){return {db:c.db,gatewayUrl:c.vpayGatewayUrl,payoutToken:c.vpayPayoutToken,callbackToken:c.vpayCallbackToken,payoutEnabled:c.vpayPayoutEnabled,newPayoutsEnabled:c.newPayoutsEnabled,vpayTraderId:c.vpayTraderId,withdrawalDataKey:c.withdrawalDataKey,fetchImpl:c.vpayFetch};}
function gspaySettings(c:Context,user:User|null,acceptance?:{realPaymentVerified:boolean;settlementVerified:boolean}){return {db:c.db,user,apiBase:c.gspayApiBase,authKey:c.gspayAuthKey,secretKey:c.gspaySecretKey,callbackToken:c.gspayCallbackToken,enabled:c.gspayOrdersEnabled,newDepositsEnabled:c.newDepositsEnabled,portalOrigins:c.allowedOrigins,returnUrl:c.gspayReturnUrl,recoveryEnabled:c.gspayRecoveryEnabled,balanceEnabled:c.gspayBalanceEnabled,payoutEnabled:c.gspayPayoutEnabled,newPayoutsEnabled:c.newPayoutsEnabled,payoutIpWhitelistConfirmed:c.gspayPayoutIpWhitelistConfirmed,payoutBankTargetsJson:c.gspayPayoutBankTargetsJson,withdrawalDataKey:c.withdrawalDataKey,acceptance,fetchImpl:c.gspayFetch};}
function gspayUsdtSettings(c:Context){return {apiBase:c.gspayUsdtApiBase,authKey:c.gspayUsdtAuthKey,secretKey:c.gspayUsdtSecretKey,callbackToken:c.gspayUsdtCallbackToken,ordersEnabled:c.gspayUsdtOrdersEnabled,returnUrl:c.gspayUsdtReturnUrl,callbackUrl:c.gspayUsdtCallbackUrl,recoveryEnabled:c.gspayUsdtRecoveryEnabled,balanceEnabled:c.gspayUsdtBalanceEnabled,contractVerified:c.gspayUsdtContractVerified,assetNetwork:c.gspayUsdtAssetNetwork,currencyScale:c.gspayUsdtCurrencyScale,checkoutOrigin:c.gspayUsdtCheckoutOrigin};}
async function withdrawalSettings(c:Context,user:User|null){const bank=await manualBankAvailability({db:c.db,user,newDepositsEnabled:c.newDepositsEnabled,newPayoutsEnabled:c.newPayoutsEnabled});const gspay=gspaySettings(c,user),vpay=vpayPayoutSettings(c),[gspayReady,vpayReady]=await Promise.all([gspayPayoutAvailability(gspay),vpayPayoutAvailability(vpay)]);return {db:c.db,user,dataKey:c.withdrawalDataKey,payouts:{manual_bank:{enabled:user?.role==='owner'?bank.payoutGateOpen:bank.payoutEnabled,allowsMember:async(id:string)=>(await manualBankAvailability({db:c.db,user:user?{...user,id}:null,newPayoutsEnabled:c.newPayoutsEnabled})).payoutEnabled,reason:bank.payoutEnabled?'Manual bank transfer after owner approval':'Company-bank withdrawals are temporarily unavailable',submit:async()=>({status:'processing' as const})},vpay:{enabled:vpayReady.enabled,reason:vpayReady.reason,supportsBank:vpayPayoutSupportsBank,submit:(input:any)=>submitVPayPayout(input,vpay)},gspay:{enabled:gspayReady.enabled,reason:gspayReady.reason,submit:(input:any)=>submitGSPayPayout(input,gspay)},'1mpay':{enabled:false,reason:'Payout bank codes and final callback states are not verified',submit:async()=>({status:'review' as const})}}};}
function oneMpaySettings(c:Context,user:User|null,acceptance?:{realPaymentVerified:boolean;settlementVerified:boolean}){return {db:c.db,user,apiBase:c.oneMpayApiBase,merchant:c.oneMpayMerchant,secretKey:c.oneMpaySecretKey,enabled:c.oneMpayOrdersEnabled,newDepositsEnabled:c.newDepositsEnabled,portalOrigins:c.allowedOrigins,callbackUrl:c.oneMpayCallbackUrl,returnUrl:c.oneMpayReturnUrl,diagnosticToken:c.oneMpayDiagnosticToken,recoveryEnabled:c.oneMpayRecoveryEnabled,acceptance,fetchImpl:c.oneMpayFetch};}
function megaWalletSettings(c:Context,user:User):MegaWalletContext{return {db:c.db,user,gatewayUrl:c.gameGatewayUrl,gameToken:c.gameGatewayToken,walletToken:c.gameGatewayWalletToken,launchOriginsJson:c.megaLaunchOriginsJson,enabled:c.megaTransfersEnabled,liveGamesEnabled:c.megaLiveGamesEnabled,newGameLaunchesEnabled:c.newGameLaunchesEnabled,settlementVerified:c.megaSettlementVerified,closeSession:c.megaSessionCloser,closureContractVerified:c.megaClosureContractVerified,fetchImpl:c.gameGatewayFetch};}
async function transferSettings(c:Context,user:User,profile:RegisteredGameProviderProfile):Promise<ProviderTransferContext>{
 const acceptance=await getGameProviderAcceptanceReadiness(c.db),profileAcceptance=acceptance.profiles.find(item=>item.profileId===profile.profileId),runtime=gameTransferRuntime(c,profile.profileId,user.id,profileAcceptance?.evidenceAccepted===true);
 if(!runtime||!runtime.recoveryEnabled)throw new ProviderTransferError(503,'GAME_TRANSFER_PROFILE_UNAVAILABLE');
 return {db:c.db,user,profile:runtime.profile,adapter:runtime.adapter,newGameLaunchesEnabled:c.newGameLaunchesEnabled,launchAuthorized:runtime.launchAuthorized,manualComplianceEnforced:c.manualComplianceEnforced==='true'};
}

function telegramSettings(c:Context){return {botToken:c.telegramBotToken,adminChatId:c.telegramAdminChatId,fetchImpl:c.telegramFetch};}
function whatsappSettings(c:Context):WhatsAppBusinessContext{return {enabled:c.whatsappEnabled,graphApiVersion:c.whatsappGraphApiVersion,phoneNumberId:c.whatsappPhoneNumberId,wabaId:c.whatsappWabaId,accessToken:c.whatsappAccessToken,appSecret:c.whatsappAppSecret,webhookVerifyToken:c.whatsappWebhookVerifyToken,businessNumber:c.whatsappBusinessNumber,templateName:c.whatsappTemplateName,templateLanguage:c.whatsappTemplateLanguage,fetchImpl:c.whatsappFetch};}
function whatsappCampaignSettings(c:Context):WhatsAppCampaignContext{return {db:c.db,provider:whatsappSettings(c),recipientLimit:c.whatsappRecipientLimit,workerToken:c.whatsappWorkerToken,workerBatchSize:c.whatsappWorkerBatchSize};}
function supportAiSettings(c:Context):SupportAiConfig{return {enabled:c.supportAiEnabled,apiBaseUrl:c.supportAiApiBaseUrl,apiKey:c.supportAiApiKey,model:c.supportAiModel,fetchImpl:c.supportAiFetch};}
async function createResponsiblePlayGuardedDeposit<T>(db:D1Database,user:User|null,provider:'vpay'|'gspay'|'1mpay'|'manual_bank',data:Record<string,unknown>,create:()=>Promise<T>,complianceEnforced?:string,newDepositsEnabled?:string){
 role(user,['member']);
 if(newDepositsEnabled!=='true')return json({error:'New deposits are temporarily unavailable',code:'DEPOSITS_MAINTENANCE'},503);
 if((await depositControls(db))[provider]==='paused')return json({error:'This deposit channel is temporarily unavailable',code:'DEPOSIT_CHANNEL_PAUSED'},503);
 const requestKey=typeof data.requestKey==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(data.requestKey)?data.requestKey:null,amountMinor=depositAmountMinor(data.amount);
 // Let the provider's existing validator return its normal 400 response for
 // malformed input. Every valid creation attempt is reserved atomically first.
 if(!requestKey||!amountMinor)return create();
 if(complianceEnforced==='true')await authorizeManualComplianceAction(db,user.id,'deposit');
 const reservation=await reserveResponsiblePlayDeposit(db,user!.id,{provider,requestKey,amountMinor});
 if(reservation.reserved&&reservation.idempotent)throw new ResponsiblePlayError(409,'DEPOSIT_REQUEST_IN_PROGRESS','This deposit request is already in progress. Check its status before trying again.');
 try{return await create();}
 finally{await finalizeResponsiblePlayDeposit(db,user!.id,provider,requestKey);}
}
async function acceptedMegaWalletSettings(c:Context,user:User){
 const acceptance=await getGameProviderAcceptanceReadiness(c.db),capabilities=acceptance.profiles.find(profile=>profile.profileId==='megah5_myr')?.capabilities??{};
 const evidence:MegaAcceptanceCapabilities={catalogue:capabilities.catalogue===true,launch:capabilities.launch===true,wallet:capabilities.wallet===true,settlement:capabilities.settlement===true,recovery:capabilities.recovery===true};
 return {...megaWalletSettings(c,user),acceptance:evidence};
}
async function megaProviderCapability(c:Context){return megaWalletCapabilities(await acceptedMegaWalletSettings(c,{id:'readiness',username:'readiness',role:'member',approved:1,csrf:'',created_at:0}));}
function cachedCatalogueCapability(c:Context):MegaWalletCapability{
 const observation=gameAvailabilityObservations.get(c.db);if(observation?.key===gameAvailabilityKey(c)&&observation.expiresAt>Date.now()&&observation.closer===c.megaSessionCloser&&observation.capability)return {...observation.capability};
 const configured=megaWalletConfigured(megaWalletSettings(c,{id:'readiness',username:'readiness',role:'member',approved:1,csrf:'',created_at:0}));
 return {availabilityMode:'automatic',readOnlyAvailability:true,configured,launchReady:false,walletReady:false,catalogueVerified:false,launchVerified:false,walletVerified:false,settlementVerified:false,recoveryVerified:false,capabilitySource:'gateway_configuration',capabilityReason:configured?'gateway_not_probed_by_catalogue_summary':'connection_not_configured'};
}
// Reports and process-health reads never probe providers. Reuse a short-lived
// observation made by the customer/catalogue path, and fail closed on restart,
// credential changes or expiry. This is capability evidence, never settlement QA.
const gameAvailabilityObservations=new WeakMap<object,{key:string;expiresAt:number;ready:boolean;capability?:MegaWalletCapability;closer?:MegaSessionCloser}>();
function gameAvailabilityKey(c:Context){return createHash('sha256').update(JSON.stringify([c.gameGatewayUrl,c.gameGatewayToken,c.gameGatewayWalletToken,c.megaLaunchOriginsJson,c.newGameLaunchesEnabled,c.megaClosureContractVerified,!!c.megaSessionCloser])).digest('hex');}
function observeGameAvailability(c:Context,ready:boolean,capability?:MegaWalletCapability){gameAvailabilityObservations.set(c.db,{key:gameAvailabilityKey(c),expiresAt:Date.now()+30_000,ready,capability,closer:c.megaSessionCloser});}
function observedGameAvailability(c:Context){const observation=gameAvailabilityObservations.get(c.db);return observation?.key===gameAvailabilityKey(c)&&observation.expiresAt>Date.now()&&observation.closer===c.megaSessionCloser&&observation.ready===true;}
const transferAvailabilityObservations=new WeakMap<object,Map<string,{key:string;expiresAt:number;ready:boolean}>>();
function transferAvailabilityKey(c:Context){return createHash('sha256').update(JSON.stringify([c.jdbTransferProfilesJson,c.gameTransferProfilesJson,c.newGameLaunchesEnabled])).digest('hex');}
function observeTransferAvailability(c:Context,profileId:string,ready:boolean){let observations=transferAvailabilityObservations.get(c.db);if(!observations){observations=new Map();transferAvailabilityObservations.set(c.db,observations);}observations.set(profileId,{key:transferAvailabilityKey(c),expiresAt:Date.now()+30_000,ready});}
function observedTransferAvailability(c:Context,profileId:string){const observation=transferAvailabilityObservations.get(c.db)?.get(profileId);return observation?.key===transferAvailabilityKey(c)&&observation.expiresAt>Date.now()&&observation.ready===true;}


async function paymentFlags(c:Context,channels:Record<string,unknown>[]){
 const productionAcceptance=await getProductionAcceptanceReadiness(c.db);
 const bank=await manualBankAvailability({db:c.db,user:null,newDepositsEnabled:c.newDepositsEnabled,newPayoutsEnabled:c.newPayoutsEnabled});
 const controls=await depositControls(c.db);
 c={...c,vpayOrdersEnabled:controls.vpay==='paused'?'false':c.vpayOrdersEnabled,gspayOrdersEnabled:controls.gspay==='paused'?'false':c.gspayOrdersEnabled,oneMpayOrdersEnabled:controls['1mpay']==='paused'?'false':c.oneMpayOrdersEnabled};
 const active=(id:string)=>channels.some(x=>x.provider_id===id&&x.status==='active');
 const vpayLocal=vpayOrdersConfigured(vpaySettings(c,null)),[vpayRemote,vpayPayout,gspayPayout]=await Promise.all([vpayLocal?vpayRemoteOrderReady(vpaySettings(c,null)):Promise.resolve(false),vpayPayoutAvailability(vpayPayoutSettings(c)),gspayPayoutAvailability(gspaySettings(c,null))]);
 const vpayCapabilities=vpayCapabilitySnapshot(vpaySettings(c,null),active('vpay'),vpayRemote),gspayCapabilities=gspayCapabilitySnapshot(gspaySettings(c,null),active('gspay'),gspayPayout.submissionEnabled),gspayUsdtCapabilities=gspayUsdtCapabilitySnapshot(gspayUsdtSettings(c)),oneMpayCapabilities=oneMpayCapabilitySnapshot(oneMpaySettings(c,null));
 const vpay=vpayCapabilities.deposit.enabled,gspay=gspayCapabilities.deposit.enabled,oneMpay=oneMpayCapabilities.deposit.enabled,gspayProgram=gspayProgramConfigured(gspaySettings(c,null));
 return {availabilityMode:'automatic' as const,readOnly:true,maintenanceControlsConfigured:{deposits:['true','false'].includes(c.newDepositsEnabled??''),gameLaunches:['true','false'].includes(c.newGameLaunchesEnabled??''),payouts:['true','false'].includes(c.newPayoutsEnabled??'')},newDepositsEnabled:c.newDepositsEnabled==='true',newGameLaunchesEnabled:c.newGameLaunchesEnabled==='true',newPayoutsEnabled:c.newPayoutsEnabled==='true',manualBankReady:bank.ready,manualBankMode:bank.mode,manualBankConfigured:bank.bankCount>0,transactionsEnabled:bank.depositEnabled||vpay||gspay||oneMpay,realPayments:bank.depositEnabled||vpay&&c.vpayMode==='production'||gspay||oneMpay,payoutsEnabled:bank.payoutEnabled||vpayPayout.enabled||gspayPayout.enabled,settlementVerified:productionAcceptance.paymentReady,productionAcceptance,providerProgramsConfigured:{gspay:gspayProgram,gspay_usdt:false,gspay_plus:false},providerOrdersEnabled:{vpay,'1mpay':oneMpay,gspay,gspay_usdt:false,gspay_plus:false},providerPayoutsEnabled:{vpay:vpayPayout.enabled,gspay:gspayPayout.enabled,gspay_usdt:false,'1mpay':false},providerCapabilities:{vpay:vpayCapabilities,gspay:gspayCapabilities,gspay_usdt:gspayUsdtCapabilities,'1mpay':oneMpayCapabilities},providerLifecycle:{gspay:'available',gspay_usdt:'available',gspay_plus:'legacy_closed'}};
}

function automaticPaymentChannels(items:Record<string,unknown>[],flags:{providerCapabilities:Record<string,any>;productionAcceptance?:{paymentProfiles?:Record<string,boolean>}}){
 return items.map(item=>{
  const id=String(item.provider_id),capabilities=flags.providerCapabilities[id],deposit=capabilities?.deposit??automaticDepositCapability({implemented:false,blockers:['deposit_adapter_not_implemented']},'configuration'),profile=id==='vpay'?'vpay_myr':id==='gspay'?'gspay_myr':id==='gspay_usdt'?'gspay_usdt':id==='1mpay'?'onempay_myr':id,currency=id==='gspay_usdt'?'USDT':'MYR';
  const accepted=flags.productionAcceptance?.paymentProfiles?.[profile]===true;
  return {...item,profileId:profile,currency,status:deposit.enabled?'active':'unavailable',enabled:deposit.enabled,...automaticPaymentStatus(deposit),retired:false,lifecycle:'available',realPaymentVerified:accepted,settlementVerified:accepted,liveReady:deposit.enabled&&accepted,capabilities:capabilities??{deposit}};
 });
}
class ApiError extends Error{ status:number; constructor(status:number,message:string){super(message);this.status=status;} }
const now=()=>Math.floor(Date.now()/1000);
const uuid=()=>crypto.randomUUID();
const eventId=()=>`z${Date.now().toString(36).padStart(10,'0')}_${uuid()}`;
function accountingPeriod(search:URLSearchParams,timestamp=now()){
 const day=Math.floor((timestamp+28800)/86400)*86400-28800,shifted=new Date((timestamp+28800)*1000),year=shifted.getUTCFullYear(),month=shifted.getUTCMonth(),period=search.get('period')||'yesterday';let start:number,end:number,label:string;
 const monthStart=(y:number,m:number)=>Math.floor(Date.UTC(y,m,1)/1000)-28800;
 if(period==='month'&&/^\d{4}-\d{2}$/.test(search.get('month')||'')){const [y,m]=(search.get('month')||'').split('-').map(Number);if(y<2020||y>2100||m<1||m>12)throw new ApiError(400,'Invalid month');start=monthStart(y,m-1);end=monthStart(y,m);label=`${y}-${String(m).padStart(2,'0')}`;}
 else if(period==='month'){start=monthStart(year,month);end=monthStart(year,month+1);label=`${year}-${String(month+1).padStart(2,'0')}`;}
 else if(period==='half'){const first=month<6?0:6;start=monthStart(year,first);end=monthStart(year,first+6);label=`${year} H${first===0?1:2}`;}
 else if(period==='year'){start=monthStart(year,0);end=monthStart(year+1,0);label=String(year);}
 else if(period==='today'){start=day;end=timestamp+1;label='Today';}
 else{start=day-86400;end=day;label=new Date((start+28800)*1000).toISOString().slice(0,10);}
 return {period,start,end,label};
}
export const responseHeaders={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Cookie, oai-authenticated-user-id'};
function json(value:unknown,status=200){return new Response(JSON.stringify(value),{status,headers:responseHeaders});}
function textField(v:unknown,min:number,max:number){if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)throw new ApiError(400,'输入长度不符合要求 / Invalid input');return v.trim();}
function idField(v:unknown){return textField(v,1,128);}
function optionalNumber(v:unknown,min:number,max:number,name:string){if(v===''||v===null||v===undefined)return null;const value=typeof v==='number'?v:Number(v);if(!Number.isFinite(value)||value<min||value>max)throw new ApiError(400,`Invalid ${name}`);return value;}
function optionalInteger(v:unknown,min:number,max:number,name:string){const value=optionalNumber(v,min,max,name);if(value!==null&&!Number.isInteger(value))throw new ApiError(400,`Invalid ${name}`);return value;}
function calculateBenefit(r:any,depositMYR:number){
 const money=(value:number)=>Math.round((value+Number.EPSILON)*100)/100,min=Number(r.minDepositMYR??0),eligible=depositMYR>=min;
 const fixed=Number(r.rewardAmountMYR??0),percentage=money(depositMYR*Number(r.rewardPercent??0)/100),uncapped=money(fixed+percentage),cap=r.maxRewardMYR==null?null:Number(r.maxRewardMYR),rewardMYR=eligible?money(cap==null?uncapped:Math.min(uncapped,cap)):0;
 const turnoverBase=r.turnoverBase??'deposit_plus_bonus',baseMYR=turnoverBase==='deposit'?depositMYR:turnoverBase==='bonus'?rewardMYR:money(depositMYR+rewardMYR),fixedTurnoverMYR=Number(r.turnoverRequiredMYR??0),fixedTurnover=fixedTurnoverMYR>0,turnoverMYR=eligible?(fixedTurnover?money(fixedTurnoverMYR):money(baseMYR*Number(r.turnoverMultiplier??0))):0;
 return {currency:'MYR',depositMYR:money(depositMYR),eligible,minDepositMYR:min,rewardMYR,turnoverMYR,turnoverBase,turnoverMultiplier:r.turnoverMultiplier??null,fixedTurnover,rewardFormula:{fixedMYR:fixed,percentage:Number(r.rewardPercent??0),maximumMYR:cap}};
}
function advertisementUrl(v:unknown){if(v===undefined||v===null||v==='')return '';const value=textField(v,1,500);let url:URL;try{url=new URL(value);}catch{throw new ApiError(400,'Invalid ad destination');}if(url.protocol!=='https:'||url.username||url.password||url.port)throw new ApiError(400,'Ad destination must be an HTTPS URL');return url.href;}
function scheduleEpoch(value:unknown,name:string){if(value===undefined||value===null||value==='')return null;if(typeof value==='number'&&Number.isSafeInteger(value)&&value>=0)return value;if(typeof value!=='string'||value.length>32||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value))throw new ApiError(400,`Invalid ${name}`);const epoch=Math.floor(Date.parse((value.length===16?value+':00':value)+'+08:00')/1000);if(!Number.isSafeInteger(epoch)||epoch<0)throw new ApiError(400,`Invalid ${name}`);return epoch;}
function scheduleWindow(startsValue:unknown,endsValue:unknown){const startsAt=scheduleEpoch(startsValue,'start time'),endsAt=scheduleEpoch(endsValue,'end time');if(startsAt!==null&&endsAt!==null&&endsAt<=startsAt)throw new ApiError(400,'End time must be after start time');return {startsAt,endsAt};}
function freshIso(value:unknown,maxAgeSeconds:number,timestamp=now()){if(typeof value!=='string')return false;const epoch=Math.floor(Date.parse(value)/1000);return Number.isFinite(epoch)&&epoch<=timestamp+300&&epoch>=timestamp-maxAgeSeconds;}
function validSha256(value:unknown){return typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);}
function authorizedBearer(req:Request,token:unknown){
 const configured=typeof token==='string'?token:'',auth=req.headers.get('authorization')??'',given=auth.startsWith('Bearer ')?auth.slice(7):'',bytes=Buffer.byteLength(configured);
 return bytes>=32&&bytes<=1024&&Buffer.byteLength(given)===bytes&&timingSafeEqual(Buffer.from(given),Buffer.from(configured));
}
function validImageData(value:string){try{const encoded=value.slice(value.indexOf(',')+1),bytes=atob(encoded);if(bytes.length<16||bytes.length>350000)return false;const prefix=(start:number,end:number)=>[...bytes.slice(start,end)].map(char=>char.charCodeAt(0));const b=prefix(0,12);return value.startsWith('data:image/jpeg;')&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff||value.startsWith('data:image/png;')&&b[0]===0x89&&b[1]===0x50&&b[2]===0x4e&&b[3]===0x47&&b[4]===0x0d&&b[5]===0x0a&&b[6]===0x1a&&b[7]===0x0a||value.startsWith('data:image/webp;')&&String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP';}catch{return false;}}
function assertAdvertisementPublishable(ad:{title:unknown;image_data:unknown;target_url?:unknown}){
 textField(ad.title,2,100);const image=typeof ad.image_data==='string'?ad.image_data:'';
 if(image.length>500000||!/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)||!validImageData(image))throw new ApiError(400,'A valid advertisement image under 350 KB is required before publishing');
 advertisementUrl(ad.target_url);
}
function assertBenefitPublishable(r:any){
 if(r.rewardType==='vip')throw new ApiError(409,'VIP member tiers are not configured; keep this offer as a draft');
 const fixed=Number(r.rewardAmountMYR??0),percent=Number(r.rewardPercent??0),cap=r.maxRewardMYR==null?null:Number(r.maxRewardMYR),fixedTurnover=Number(r.turnoverRequiredMYR??0),multiplier=Number(r.turnoverMultiplier??0);
 if(!(fixed>0||percent>0))throw new ApiError(400,'Set a reward amount or percentage before publishing');
 if(percent>0&&!(cap!==null&&cap>0))throw new ApiError(400,'Set a maximum reward for percentage benefits before publishing');
 if(cap!==null&&(cap<=0||cap<fixed))throw new ApiError(400,'Maximum reward must cover the fixed reward');
 if((fixedTurnover>0)===(multiplier>0))throw new ApiError(400,'Set exactly one positive turnover requirement: fixed amount or multiplier');
 if(['deposit_bonus','cashback','turnover'].includes(r.rewardType)&&!(Number(r.minDepositMYR)>0))throw new ApiError(400,'Set a positive minimum deposit for this benefit type');
 if(!(Number.isInteger(r.claimLimitPerMember)&&r.claimLimitPerMember>0))throw new ApiError(400,'Set claims per member before publishing');
 if(!(Number.isInteger(r.validityDays)&&r.validityDays>0))throw new ApiError(400,'Set validity days before publishing');
 if(r.withdrawalCapMYR!==null&&r.withdrawalCapMYR!==undefined&&!(Number(r.withdrawalCapMYR)>0))throw new ApiError(400,'Withdrawal cap must be positive when set');
 if(r.stopFreeChancesOnFirstWin===true&&!(Number.isInteger(r.freeChances)&&r.freeChances>0))throw new ApiError(400,'Set free chances before enabling the first-win stop rule');
}
function urlField(v:unknown,service:string){if(v==='')return '';const s=textField(v,1,300);let u:URL;try{u=new URL(s);}catch{throw new ApiError(400,'Invalid URL');}if(u.protocol!=='https:'||u.username||u.password||u.port||!['www.'+service+'.com',service+'.com'].includes(u.hostname))throw new ApiError(400,'请使用官方 HTTPS 主页地址');return u.href;}
function contactUrlField(v:unknown,hosts:string[],label:string){if(v==='')return '';const s=textField(v,1,300);let u:URL;try{u=new URL(s);}catch{throw new ApiError(400,`${label} 链接无效`);}if(u.protocol!=='https:'||u.username||u.password||u.port||!hosts.includes(u.hostname))throw new ApiError(400,`请使用官方 ${label} HTTPS 链接`);return u.href;}
function hotlineField(v:unknown){if(v==='')return '';const s=textField(v,7,32),digits=s.replace(/\D/g,'');if(!/^\+?[0-9 ()-]+$/.test(s)||digits.length<7||digits.length>15)throw new ApiError(400,'Hotline 电话号码无效');return s;}
function whatsappField(v:unknown){if(v==='')return '';const s=textField(v,8,24),digits=s.replace(/\D/g,'');if(!/^\+?[0-9 ()-]+$/.test(s)||digits.length<8||digits.length>15)throw new ApiError(400,'WhatsApp 电话号码无效');return digits;}
function wechatField(v:unknown){if(v==='')return '';const s=textField(v,1,64);if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(s))throw new ApiError(400,'WeChat ID 无效');return s;}
function telegramField(v:unknown){if(v==='')return '';if(typeof v==='string'&&/^@?[A-Za-z0-9_]{5,32}$/.test(v.trim()))return `https://t.me/${v.trim().replace(/^@/,'')}`;return contactUrlField(v,['t.me','telegram.me','www.telegram.me'],'Telegram');}
function metaPixelField(v:unknown){if(v==='')return '';const s=textField(v,6,32);if(!/^\d{6,32}$/.test(s))throw new ApiError(400,'Meta Pixel ID 必须是数字');return s;}
function googleTagField(v:unknown){if(v==='')return '';const s=textField(v,6,32).toUpperCase();if(!/^(?:G|AW)-[A-Z0-9]{4,20}$/.test(s))throw new ApiError(400,'Google tag ID must start with G- or AW-');return s;}
function role(u:User|null,roles=['owner','staff','member']):asserts u is User{if(!u)throw new ApiError(401,'请先登录 / Sign in required');if(!roles.includes(u.role))throw new ApiError(403,'没有访问权限 / Access denied');}
const financialEventTypes:FinancialEventType[]=['deposit','manual_bank','withdrawal'];
function encodeFinancialEventCursor(value:FinancialEventCursor){return Buffer.from(JSON.stringify([value.createdAt,value.type,value.id])).toString('base64url');}
function decodeFinancialEventCursor(value:string|null){
 if(value===null||value==='')return null;if(value.length>512||!/^[A-Za-z0-9_-]+$/.test(value))throw new ApiError(400,'Invalid financial event cursor');
 try{const decoded=JSON.parse(Buffer.from(value,'base64url').toString('utf8'));if(!Array.isArray(decoded)||decoded.length!==3||!Number.isSafeInteger(decoded[0])||decoded[0]<0||!financialEventTypes.includes(decoded[1])||typeof decoded[2]!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(decoded[2]))throw Error();return {createdAt:decoded[0],type:decoded[1] as FinancialEventType,id:decoded[2]};}catch{throw new ApiError(400,'Invalid financial event cursor');}
}
async function currentUser(c:Context,create=false){if(!c.identity)return null;const {userId,email}=c.identity;let u=await c.db.prepare('SELECT * FROM users WHERE id=?').bind(userId).first<User>();if(!u&&create){await c.db.prepare('INSERT OR IGNORE INTO users(id,username,role,approved,csrf,created_at) VALUES(?,?,?,?,?,?)').bind(userId,email,'member',0,uuid()+uuid(),now()).run();u=await c.db.prepare('SELECT * FROM users WHERE id=?').bind(userId).first<User>();}if(u?.role==='staff')return null;return u;}
function auditStmt(db:D1Database,u:User,event:string,target:string){return db.prepare('INSERT INTO audit(id,user_id,event,target,created_at) VALUES(?,?,?,?,?)').bind(uuid(),u.id,event,target,now());}
async function rows(db:D1Database,sql:string,...values:(string|number)[]){return (await db.prepare(sql).bind(...values).all()).results;}
async function productionRecoveryReadiness(db:D1Database){
 const [backupAudit,rehearsalRow]=await Promise.all([
  latestEncryptedBackupAudit(db),
  db.prepare("SELECT value FROM settings WHERE id='backup_restore_rehearsal'").first<{value:string}>()
 ]);
 let rehearsal:any=null;try{rehearsal=rehearsalRow?.value?JSON.parse(rehearsalRow.value):null;}catch{}
 const backupMetadata=backupAudit?.metadata??null;
 const backupReady=!!backupMetadata&&backupMetadata.format===BACKUP_FORMAT&&backupMetadata.release===RELEASE&&backupMetadata.schemaVersion===BACKUP_SCHEMA_VERSION&&backupMetadata.schemaSha256===BACKUP_SCHEMA_SHA256&&backupMetadata.publicKeySha256===BACKUP_PUBLIC_KEY_SHA256&&backupMetadata.readConsistency==='transaction_snapshot'&&backupMetadata.tableCount===BACKUP_TABLES.length&&Number.isSafeInteger(backupMetadata.totalRecords)&&backupMetadata.totalRecords>=0&&validSha256(backupMetadata.backupSha256)&&validSha256(backupMetadata.plaintextSha256)&&validSha256(backupMetadata.ciphertextSha256)&&freshIso(backupMetadata.createdAt,7*86400)&&Number(backupAudit?.created_at??0)>=now()-7*86400;
 const restoreCreatedAt=Date.parse(rehearsal?.createdAt??''),restoreVerifiedAt=Date.parse(rehearsal?.verifiedAt??'');
 const restoreReady=backupReady&&!!rehearsal&&rehearsal.status==='verified'&&rehearsal.format===BACKUP_FORMAT&&rehearsal.release===RELEASE&&rehearsal.schemaVersion===BACKUP_SCHEMA_VERSION&&rehearsal.schemaSha256===BACKUP_SCHEMA_SHA256&&rehearsal.publicKeySha256===BACKUP_PUBLIC_KEY_SHA256&&rehearsal.coverageComplete===true&&Array.isArray(rehearsal.missingTables)&&rehearsal.missingTables.length===0&&rehearsal.readConsistency==='transaction_snapshot'&&rehearsal.persistentWrites===false&&rehearsal.restoreTargetKind==='isolated_postgresql_transaction'&&validSha256(rehearsal.restoreTargetSha256)&&rehearsal.foreignKeyViolations===0&&rehearsal.tableCount===BACKUP_TABLES.length&&rehearsal.totalRecords===backupMetadata.totalRecords&&rehearsal.createdAt===backupMetadata.createdAt&&rehearsal.backupSha256===backupMetadata.backupSha256&&rehearsal.plaintextSha256===backupMetadata.plaintextSha256&&freshIso(rehearsal.createdAt,30*86400)&&freshIso(rehearsal.verifiedAt,30*86400)&&Number.isFinite(restoreCreatedAt)&&Number.isFinite(restoreVerifiedAt)&&restoreVerifiedAt>=restoreCreatedAt;
 return {backupReady,restoreReady,backupCreatedAt:backupReady?backupMetadata.createdAt:null,restoreVerifiedAt:restoreReady?rehearsal.verifiedAt:null};
}
async function canonicalOperationsReadiness(c:Context){
 const [payments,runtimeReadyProfileIds,recovery]=await Promise.all([paymentFlags(c,await rows(c.db,'SELECT provider_id,status FROM payment_channel_controls')),gameRuntimeReadyProfileIds(c),productionRecoveryReadiness(c.db)]),gameAcceptance=await getGameProviderAcceptanceReadiness(c.db,runtimeReadyProfileIds),megaAvailable=runtimeReadyProfileIds.includes('megah5_myr'),settlementVerified=payments.settlementVerified===true;
 // Acceptance evidence is necessary but never sufficient: the aggregate also
 // requires a registered implemented adapter and current runtime/catalogue
 // capability for every listed profile.
 const allGamesVerified=gameAcceptance.allGamesVerified,gamesReady=gameAcceptance.liveGames;
 const productionAcceptance=payments.productionAcceptance;
 return {payments,readiness:{productionReady:gameAcceptance.integrityReady===true&&productionAcceptance.integrityReady===true&&payments.realPayments===true&&payments.payoutsEnabled===true&&settlementVerified&&gamesReady&&recovery.backupReady&&recovery.restoreReady&&productionAcceptance.domainReady&&productionAcceptance.credentialRotationReady&&productionAcceptance.signoffReady,paymentsReady:productionAcceptance.integrityReady===true&&payments.realPayments===true&&productionAcceptance.paymentReady,payoutsReady:payments.payoutsEnabled===true,settlementVerified,gamesReady,backupReady:recovery.backupReady,restoreReady:recovery.restoreReady,backupCreatedAt:recovery.backupCreatedAt,restoreVerifiedAt:recovery.restoreVerifiedAt,megaAvailable,allGamesVerified,gameAcceptance,productionAcceptance,whatsappReady:whatsappCampaignStatus(whatsappCampaignSettings(c)).ready===true,supportAiProviderReady:supportAiProviderStatus(supportAiSettings(c)).externalProviderReady===true,expectedCatalogueIds:configuredGameCatalogueCacheKeys(c)}};
}

async function gameRuntimeReadyProfileIds(c:Context){
 // Health remains a local/database read. The short-lived observation is only
 // written by the customer catalogue path after it has checked current
 // catalogue and adapter capability; a restart, expiry or missing observation
 // fails closed without probing a provider from /health.
 return [...(observedGameAvailability(c)?['megah5_myr']:[]),...listedGameProfiles.filter(profile=>transferProfileSupported(profile)&&observedTransferAvailability(c,profile.profileId)&&gameTransferRuntime(c,profile.profileId,'readiness',true)?.mode==='production').map(profile=>profile.profileId)];
}
function eventAfter(eventAt:number,eventId:string,readAt:unknown,readId:unknown){const at=Number(readAt??-1),id=String(readId??'');return eventAt>at||eventAt===at&&eventId>id;}
async function ticketNotificationState(db:D1Database,u:User){
 const staff=u.role!=='member',scope=staff?'':'WHERE t.user_id=?',items=await rows(db,`SELECT t.id,t.user_id,t.created_at,tr.last_event_at,tr.last_event_id,(SELECT r.created_at FROM replies r WHERE r.ticket_id=t.id AND r.user_id<>? ORDER BY r.created_at DESC,r.id DESC LIMIT 1) other_reply_at,(SELECT r.id FROM replies r WHERE r.ticket_id=t.id AND r.user_id<>? ORDER BY r.created_at DESC,r.id DESC LIMIT 1) other_reply_id FROM tickets t LEFT JOIN ticket_reads tr ON tr.ticket_id=t.id AND tr.user_id=? ${scope}`,...(staff?[u.id,u.id,u.id]:[u.id,u.id,u.id,u.id]));
 let unread=0,latestAt=-1,latestId='';for(const item of items as any[]){let at=-1,id='';if(item.user_id!==u.id){at=Number(item.created_at);id=String(item.id);}if(item.other_reply_at!==null&&item.other_reply_at!==undefined&&(Number(item.other_reply_at)>at||Number(item.other_reply_at)===at&&String(item.other_reply_id)>id)){at=Number(item.other_reply_at);id=String(item.other_reply_id);}if(at>=0){if(eventAfter(at,id,item.last_event_at,item.last_event_id))unread++;if(at>latestAt||at===latestAt&&id>latestId){latestAt=at;latestId=id;}}}
 return {unread,latestEvent:latestAt<0?'':`${latestAt}:${latestId}`};
}
async function body(req:Request,maxBytes=24000){if(!req.headers.get('content-type')?.startsWith('application/json'))throw new ApiError(415,'JSON required');const reader=req.body?.getReader();if(!reader)throw new ApiError(400,'Body required');const parts:Uint8Array[]=[];let size=0;for(;;){const x=await reader.read();if(x.done)break;size+=x.value.length;if(size>maxBytes){await reader.cancel();throw new ApiError(413,'Request too large');}parts.push(x.value);}const out=new Uint8Array(size);let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length;}let d;try{d=JSON.parse(new TextDecoder().decode(out));}catch{throw new ApiError(400,'Invalid JSON');}if(!d||Array.isArray(d)||typeof d!=='object')throw new ApiError(400,'Object required');return d;}
async function rawBody(req:Request,maxBytes=1048576){const reader=req.body?.getReader();if(!reader)throw new ApiError(400,'Body required');const parts:Uint8Array[]=[];let size=0;for(;;){const x=await reader.read();if(x.done)break;size+=x.value.length;if(size>maxBytes){await reader.cancel();throw new ApiError(413,'Request too large');}parts.push(x.value);}const out=new Uint8Array(size);let offset=0;for(const part of parts){out.set(part,offset);offset+=part.length;}return out;}
async function limited(db:D1Database,u:User,maxPerMinute=30){const bucket=Math.floor(now()/60),key=u.id+':'+bucket;const r=await db.prepare('INSERT INTO rate_limits(id,count,expires_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=rate_limits.count+1 RETURNING count').bind(key,now()+120).first<{count:number}>();if((r?.count??maxPerMinute+1)>maxPerMinute){await auditStmt(db,u,'write_rate_limited','request').run();throw new ApiError(429,'操作过快，请稍后重试 / Too many requests');}await db.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(now()).run();}
const socialContactTypes=['hotline','whatsapp','wechat','line','telegram','facebook','instagram'] as const;
type SocialContactType=(typeof socialContactTypes)[number];
type SocialContact={id:string;type:SocialContactType;label:string;value:string;enabled:boolean;position:number};
type SocialPixel={id:string;provider:'meta'|'google';trackingId:string;enabled:boolean;position:number};
const socialDefaults={enabled:false,revision:0,contacts:[] as SocialContact[],pixels:[] as SocialPixel[],hotline:'',whatsapp:'',wechat:'',lineUrl:'',telegramUrl:'',facebookUrl:'',instagramUrl:'',pixelEnabled:false,metaPixelId:'',googleTagId:''};
function socialItemId(value:unknown,prefix:string){const id=typeof value==='string'?value.trim():'';if(!new RegExp(`^${prefix}_[A-Za-z0-9_-]{6,48}$`).test(id))throw new ApiError(400,'Invalid configuration item ID');return id;}
function socialLabel(value:unknown){const label=textField(value,1,40);if(/[\u0000-\u001f\u007f<>]/.test(label))throw new ApiError(400,'Invalid contact label');return label;}
function socialContactValue(type:SocialContactType,value:unknown){
 if(type==='hotline')return hotlineField(value);if(type==='whatsapp')return whatsappField(value);if(type==='wechat')return wechatField(value);
 if(type==='line')return contactUrlField(value,['line.me','www.line.me','lin.ee'],'LINE');if(type==='telegram')return telegramField(value);
 if(type==='facebook')return urlField(value,'facebook');return urlField(value,'instagram');
}
function socialContact(item:any,position:number):SocialContact{if(!item||typeof item!=='object'||!socialContactTypes.includes(item.type))throw new ApiError(400,'Invalid contact type');const type=item.type as SocialContactType;return {id:socialItemId(item.id,'contact'),type,label:socialLabel(item.label),value:socialContactValue(type,item.value),enabled:item.enabled===true,position};}
function socialPixel(item:any,position:number):SocialPixel{if(!item||typeof item!=='object'||!['meta','google'].includes(item.provider))throw new ApiError(400,'Invalid advertising provider');const provider=item.provider as 'meta'|'google',trackingId=provider==='meta'?metaPixelField(item.trackingId):googleTagField(item.trackingId);return {id:socialItemId(item.id,'pixel'),provider,trackingId,enabled:item.enabled===true,position};}
function socialCompatibility(value:{contacts:SocialContact[];pixels:SocialPixel[]}){
 const first=(type:SocialContactType)=>value.contacts.find(item=>item.type===type)?.value??'',meta=value.pixels.find(item=>item.provider==='meta'),google=value.pixels.find(item=>item.provider==='google');
 return {hotline:first('hotline'),whatsapp:first('whatsapp'),wechat:first('wechat'),lineUrl:first('line'),telegramUrl:first('telegram'),facebookUrl:first('facebook'),instagramUrl:first('instagram'),pixelEnabled:meta?.enabled===true,metaPixelId:meta?.trackingId??'',googleTagId:google?.trackingId??''};
}
function legacySocialItems(value:any){
 const contacts:any[]=[];for(const [type,key,label] of [['hotline','hotline','Hotline'],['whatsapp','whatsapp','WhatsApp'],['wechat','wechat','WeChat'],['line','lineUrl','LINE'],['telegram','telegramUrl','Telegram'],['facebook','facebookUrl','Facebook'],['instagram','instagramUrl','Instagram']] as const)if(value[key])contacts.push({id:`contact_${type}_legacy`,type,label,value:value[key],enabled:true});
 const pixels:any[]=[];if(value.metaPixelId)pixels.push({id:'pixel_meta_legacy',provider:'meta',trackingId:value.metaPixelId,enabled:value.pixelEnabled===true});return {contacts,pixels};
}
function storedSocial(raw:any){
 const value=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{},safe=<T>(reader:()=>T,fallback:T)=>{try{return reader();}catch{return fallback;}},legacy=legacySocialItems(value);
 const sourceContacts=Array.isArray(value.contacts)?value.contacts:legacy.contacts,sourcePixels=Array.isArray(value.pixels)?value.pixels:legacy.pixels;
 const contacts=sourceContacts.slice(0,20).map((item:any,index:number)=>safe(()=>socialContact(item,index),null)).filter(Boolean) as SocialContact[];
 const pixels=sourcePixels.slice(0,10).map((item:any,index:number)=>safe(()=>socialPixel(item,index),null)).filter(Boolean) as SocialPixel[];
 const revision=Number.isSafeInteger(value.revision)&&value.revision>=0?value.revision:0,normalized={enabled:value.enabled===true,revision,contacts,pixels};return {...socialDefaults,...normalized,...socialCompatibility(normalized)};
}
function socialPayload(d:any,current:ReturnType<typeof storedSocial>){
 if(typeof d.enabled!=='boolean')throw new ApiError(400,'Invalid state');let contacts:any[],pixels:any[];
 if(Array.isArray(d.contacts)||Array.isArray(d.pixels)){if(!Array.isArray(d.contacts)||!Array.isArray(d.pixels)||d.contacts.length>20||d.pixels.length>10)throw new ApiError(400,'Invalid configuration list');contacts=d.contacts;pixels=d.pixels;}
 else{const field=(key:string)=>d[key]===undefined?(current as any)[key]:d[key],legacy=legacySocialItems({...current,...d,hotline:field('hotline'),whatsapp:field('whatsapp'),wechat:field('wechat'),lineUrl:field('lineUrl'),telegramUrl:field('telegramUrl'),facebookUrl:field('facebookUrl'),instagramUrl:field('instagramUrl'),metaPixelId:field('metaPixelId'),pixelEnabled:d.pixelEnabled===undefined?current.pixelEnabled:d.pixelEnabled});contacts=legacy.contacts;pixels=legacy.pixels;}
 const ids=new Set<string>(),normalizedContacts=contacts.map((item,index)=>socialContact(item,index)),normalizedPixels=pixels.map((item,index)=>socialPixel(item,index));
 for(const item of [...normalizedContacts,...normalizedPixels]){if(ids.has(item.id))throw new ApiError(400,'Duplicate configuration item ID');ids.add(item.id);}
 if(d.enabled&&!normalizedContacts.some(item=>item.enabled&&item.value))throw new ApiError(400,'至少开启一个前台联系方式');
 return {enabled:d.enabled,contacts:normalizedContacts,pixels:normalizedPixels};
}
async function social(db:D1Database){const x=await db.prepare('SELECT value FROM settings WHERE id=?').bind('social').first<{value:string}>();if(!x)return {...socialDefaults};try{return storedSocial(JSON.parse(x.value));}catch{return {...socialDefaults};}}
async function socialHistory(db:D1Database){const result=await db.prepare('SELECT r.revision,r.configuration,r.created_at,u.username created_by FROM public_contact_revisions r LEFT JOIN users u ON u.id=r.created_by ORDER BY r.revision DESC LIMIT 25').all<any>();return (result.results??[]).map(row=>{let configuration={...socialDefaults};try{configuration=storedSocial(JSON.parse(row.configuration));}catch{}return {revision:Number(row.revision),createdAt:Number(row.created_at),createdBy:row.created_by??'',enabled:configuration.enabled,contactCount:configuration.contacts.length,pixelCount:configuration.pixels.length};});}
const commissionDefaults={enabled:false,basis:'deposit',maxLevels:3,claimMode:'manual',tierRatesPercent:[5,2,1],frequency:'weekly_mon',minQualifyingMYR:0,minActiveDownlines:0,dailyCapMYR:500,monthlyCapMYR:10000,lifetimeCapMYR:0,holdDays:1,expireUnclaimedDays:30,minClaimMYR:50,minAccrualMYR:.01,turnoverValue:1,turnoverType:'multiplier',winoverValue:0,winoverType:'multiplier',maxWithdrawFixedMYR:0,maxWithdrawMultiplier:0,gameCategory:'all',eligibleGames:'',startsAt:'',endsAt:''};
function finiteSetting(value:unknown,fallback:number,min:number,max:number,integer=false){const parsed=Number(value);return Number.isFinite(parsed)&&parsed>=min&&parsed<=max?(integer?Math.round(parsed):Math.round((parsed+Number.EPSILON)*100)/100):fallback;}
function normalizedCommissionSettings(value:any){
 const raw=value&&typeof value==='object'&&!Array.isArray(value)?value:{},legacyRate=Number.isInteger(raw.rateBasisPoints)?raw.rateBasisPoints/100:commissionDefaults.tierRatesPercent[0],rates=Array.isArray(raw.tierRatesPercent)?raw.tierRatesPercent:[];
 return {...commissionDefaults,enabled:raw.enabled===true,basis:['deposit','turnover','company_profit'].includes(raw.basis)?raw.basis:'deposit',maxLevels:finiteSetting(raw.maxLevels,commissionDefaults.maxLevels,1,3,true),claimMode:['manual','automatic'].includes(raw.claimMode)?raw.claimMode:'manual',tierRatesPercent:[0,1,2].map(index=>finiteSetting(rates[index],index?commissionDefaults.tierRatesPercent[index]:legacyRate,0,100)),frequency:['daily','weekly_mon','monthly'].includes(raw.frequency)?raw.frequency:'weekly_mon',minQualifyingMYR:finiteSetting(raw.minQualifyingMYR,0,0,1000000),minActiveDownlines:finiteSetting(raw.minActiveDownlines,0,0,100000,true),dailyCapMYR:finiteSetting(raw.dailyCapMYR,500,0,1000000),monthlyCapMYR:finiteSetting(raw.monthlyCapMYR,10000,0,10000000),lifetimeCapMYR:finiteSetting(raw.lifetimeCapMYR,0,0,100000000),holdDays:finiteSetting(raw.holdDays,1,0,3650,true),expireUnclaimedDays:finiteSetting(raw.expireUnclaimedDays,30,0,3650,true),minClaimMYR:finiteSetting(raw.minClaimMYR,50,0,1000000),minAccrualMYR:finiteSetting(raw.minAccrualMYR,.01,.01,100000),turnoverValue:finiteSetting(raw.turnoverValue,1,0,1000000),turnoverType:['multiplier','fixed'].includes(raw.turnoverType)?raw.turnoverType:'multiplier',winoverValue:finiteSetting(raw.winoverValue,0,0,1000000),winoverType:['multiplier','fixed'].includes(raw.winoverType)?raw.winoverType:'multiplier',maxWithdrawFixedMYR:finiteSetting(raw.maxWithdrawFixedMYR,0,0,10000000),maxWithdrawMultiplier:finiteSetting(raw.maxWithdrawMultiplier,0,0,10000),gameCategory:typeof raw.gameCategory==='string'&&/^(all|slot|live|fish|sport|fast_game)$/.test(raw.gameCategory)?raw.gameCategory:'all',eligibleGames:typeof raw.eligibleGames==='string'?raw.eligibleGames.slice(0,2000):'',startsAt:typeof raw.startsAt==='string'?raw.startsAt.slice(0,32):'',endsAt:typeof raw.endsAt==='string'?raw.endsAt.slice(0,32):''};
}
function commissionInput(value:any){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new ApiError(400,'Invalid commission settings');
 const required=(key:string,min:number,max:number,integer=false)=>{const parsed=Number(value[key]);if(!Number.isFinite(parsed)||parsed<min||parsed>max)throw new ApiError(400,`Invalid ${key}`);return integer?Math.round(parsed):Math.round((parsed+Number.EPSILON)*100)/100;},choice=(key:string,values:string[])=>{if(typeof value[key]!=='string'||!values.includes(value[key]))throw new ApiError(400,`Invalid ${key}`);return value[key];},date=(key:string)=>{const input=value[key];if(input===undefined||input===null||input==='')return '';const normalized=typeof input==='string'&&input.length===16?input+':00':input;if(typeof input!=='string'||input.length>32||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(input)||!Number.isFinite(Date.parse(normalized+'+08:00')))throw new ApiError(400,`Invalid ${key}`);return input;};
 const rates=value.tierRatesPercent;if(!Array.isArray(rates)||rates.length!==3)throw new ApiError(400,'Three tier rates are required');
 return {enabled:typeof value.enabled==='boolean'?value.enabled:(()=>{throw new ApiError(400,'Invalid commission state')})(),basis:choice('basis',['deposit','turnover','company_profit']),maxLevels:required('maxLevels',1,3,true),claimMode:choice('claimMode',['manual','automatic']),tierRatesPercent:rates.map((rate:any,index:number)=>{const parsed=Number(rate);if(!Number.isFinite(parsed)||parsed<0||parsed>100)throw new ApiError(400,`Invalid L${index+1} rate`);return Math.round((parsed+Number.EPSILON)*100)/100;}),frequency:choice('frequency',['daily','weekly_mon','monthly']),minQualifyingMYR:required('minQualifyingMYR',0,1000000),minActiveDownlines:required('minActiveDownlines',0,100000,true),dailyCapMYR:required('dailyCapMYR',0,1000000),monthlyCapMYR:required('monthlyCapMYR',0,10000000),lifetimeCapMYR:required('lifetimeCapMYR',0,100000000),holdDays:required('holdDays',0,3650,true),expireUnclaimedDays:required('expireUnclaimedDays',0,3650,true),minClaimMYR:required('minClaimMYR',0,1000000),minAccrualMYR:required('minAccrualMYR',.01,100000),turnoverValue:required('turnoverValue',0,1000000),turnoverType:choice('turnoverType',['multiplier','fixed']),winoverValue:required('winoverValue',0,1000000),winoverType:choice('winoverType',['multiplier','fixed']),maxWithdrawFixedMYR:required('maxWithdrawFixedMYR',0,10000000),maxWithdrawMultiplier:required('maxWithdrawMultiplier',0,10000),gameCategory:choice('gameCategory',['all','slot','live','fish','sport','fast_game']),eligibleGames:typeof value.eligibleGames==='string'?value.eligibleGames.slice(0,2000):'',startsAt:date('startsAt'),endsAt:date('endsAt')};
}
async function referralSettings(db:D1Database){
 const row=await db.prepare("SELECT value FROM settings WHERE id='referral_program'").first<{value:string}>();let value:any={};try{value=row?JSON.parse(row.value):{};}catch{}const settings=normalizedCommissionSettings(value),rateBasisPoints=Math.round(settings.tierRatesPercent[0]*100);return {...settings,rateBasisPoints,configured:!!row};
}
function latestCommissionPeriod(frequency:string,at=now()){
 const offset=8*3600,shifted=new Date((at+offset)*1000),midnight=Math.floor(Date.UTC(shifted.getUTCFullYear(),shifted.getUTCMonth(),shifted.getUTCDate())/1000)-offset;
 if(frequency==='daily')return {start:midnight-86400,end:midnight};
 if(frequency==='monthly'){const end=Math.floor(Date.UTC(shifted.getUTCFullYear(),shifted.getUTCMonth(),1)/1000)-offset,start=Math.floor(Date.UTC(shifted.getUTCFullYear(),shifted.getUTCMonth()-1,1)/1000)-offset;return {start,end};}
 const sinceMonday=(shifted.getUTCDay()+6)%7,end=midnight-sinceMonday*86400;return {start:end-7*86400,end};
}
function mytSettingEpoch(value:string){if(!value)return null;const normalized=value.length===16?value+':00':value,ms=Date.parse(normalized+'+08:00');return Number.isFinite(ms)?Math.floor(ms/1000):null;}
async function commissionPreview(db:D1Database,settings:any){
 const period=latestCommissionPeriod(settings.frequency),basisReady=settings.basis==='deposit',startLimit=mytSettingEpoch(settings.startsAt),endLimit=mytSettingEpoch(settings.endsAt),scheduleActive=(startLimit===null||period.end>startLimit)&&(endLimit===null||period.start<endLimit);
 const relationships=await rows(db,'SELECT member_id,referrer_id,created_at FROM referral_relationships ORDER BY created_at ASC'),users=await rows(db,'SELECT id,username FROM users'),names=new Map(users.map((item:any)=>[String(item.id),String(item.username)])),parent=new Map(relationships.map((item:any)=>[String(item.member_id),String(item.referrer_id)]));
 const calculationEnabled=settings.configured===true&&settings.enabled===true,basisActive=calculationEnabled&&basisReady&&scheduleActive,deposits=basisActive?await rows(db,"SELECT user_id,CAST(COALESCE(SUM(amount_minor),0) AS TEXT) basis_minor,COUNT(*) orders FROM deposit_orders WHERE status='credited' AND updated_at>=? AND updated_at<? GROUP BY user_id",period.start,period.end):[],minBasis=BigInt(Math.round(settings.minQualifyingMYR*100)),unit=BigInt(Math.max(1,Math.round(settings.minAccrualMYR*100))),raw:any[]=[];
 for(const item of deposits as any[]){const sourceId=String(item.user_id),basis=BigInt(String(item.basis_minor??0));if(basis<minBasis)continue;let upline=parent.get(sourceId);for(let level=1;level<=settings.maxLevels&&upline;level++){const rate=Math.round(settings.tierRatesPercent[level-1]*100);let amount=basis*BigInt(rate)/10000n;amount=amount/unit*unit;if(amount>0n){const availableAt=period.end+settings.holdDays*86400,expiresAt=settings.expireUnclaimedDays?period.end+(settings.holdDays+settings.expireUnclaimedDays)*86400:null,at=now(),availabilityState=expiresAt!==null&&expiresAt<=at?'expired_preview':availableAt>at?'held_preview':'eligible_preview';raw.push({uplineId:upline,uplineUsername:names.get(upline)??upline,sourceMemberId:sourceId,sourceMemberUsername:names.get(sourceId)??sourceId,level,ratePercent:settings.tierRatesPercent[level-1],basisMinor:basis.toString(),orders:Number(item.orders??0),commissionMinor:amount.toString(),availableAt,expiresAt,status:'preview',availabilityState});}upline=parent.get(upline);}}
 const sourcesByUpline=new Map<string,Set<string>>();for(const entry of raw){if(!sourcesByUpline.has(entry.uplineId))sourcesByUpline.set(entry.uplineId,new Set());sourcesByUpline.get(entry.uplineId)!.add(entry.sourceMemberId);}let ledger=raw.filter(entry=>(sourcesByUpline.get(entry.uplineId)?.size??0)>=settings.minActiveDownlines);
 const periodDays=Math.max(1,Math.round((period.end-period.start)/86400)),dailyCap=BigInt(Math.round(settings.dailyCapMYR*100))*BigInt(periodDays),monthlyCap=BigInt(Math.round(settings.monthlyCapMYR*100)),cap=dailyCap&&monthlyCap?(dailyCap<monthlyCap?dailyCap:monthlyCap):(dailyCap||monthlyCap),used=new Map<string,bigint>();
 if(cap>0n)ledger=ledger.map(entry=>{const current=used.get(entry.uplineId)??0n,remaining=cap>current?cap-current:0n,amount=BigInt(entry.commissionMinor),applied=amount<remaining?amount:remaining;used.set(entry.uplineId,current+applied);return {...entry,commissionMinor:applied.toString(),capped:applied<amount};}).filter(entry=>BigInt(entry.commissionMinor)>0n);
 const grouped=new Map<string,any>();for(const entry of ledger){const item=grouped.get(entry.uplineId)??{uplineId:entry.uplineId,uplineUsername:entry.uplineUsername,downlines:new Set<string>(),basisMinor:0n,commissionMinor:0n,entries:0};item.downlines.add(entry.sourceMemberId);item.basisMinor+=BigInt(entry.basisMinor);item.commissionMinor+=BigInt(entry.commissionMinor);item.entries++;grouped.set(entry.uplineId,item);}
 const byUpline=[...grouped.values()].map(item=>({uplineId:item.uplineId,uplineUsername:item.uplineUsername,activeDownlines:item.downlines.size,basisMinor:item.basisMinor.toString(),commissionMinor:item.commissionMinor.toString(),entries:item.entries})).sort((a,b)=>BigInt(a.commissionMinor)===BigInt(b.commissionMinor)?0:BigInt(a.commissionMinor)>BigInt(b.commissionMinor)?-1:1),totalBasisMinor=ledger.reduce((sum,entry)=>sum+BigInt(entry.basisMinor),0n).toString(),totalCommissionMinor=ledger.reduce((sum,entry)=>sum+BigInt(entry.commissionMinor),0n).toString();
 const reason=!settings.configured?'Commission rules have not been saved':!settings.enabled?'Commission program is disabled':!basisReady?'Selected basis data is not connected':!scheduleActive?'Program is outside its configured date range':'';
 return {configured:settings.configured===true,enabled:settings.enabled===true,basis:settings.basis,basisReady,scheduleActive,calculationEnabled:basisActive,reason,period:{...period,timezone:'MYT (+08:00)',frequency:settings.frequency},relationshipCount:relationships.length,ledger,byUpline,totalBasisMinor,totalCommissionMinor,walletCreditAutomated:false,commissionWithdrawable:false,claimMode:settings.claimMode,state:'preview_only'};
}
async function supportAutomationSettings(db:D1Database,c:Context){
 const row=await db.prepare("SELECT value FROM settings WHERE id='support_automation'").first<{value:string}>();let value:any={};try{value=row?JSON.parse(row.value):{};}catch{}
 const aiEnabled=row?value.aiEnabled!==false:true,humanHandoff=value.humanHandoff!==false,provider=supportAiProviderStatus(supportAiSettings(c)),externalActive=aiEnabled&&provider.externalProviderReady;
 return {...provider,aiEnabled,humanHandoff,providerReady:true,effectiveAiReply:aiEnabled,status:aiEnabled?(externalActive?'stephanie_external_active':'stephanie_rules_active'):'stephanie_ready',engine:externalActive?'openai_compatible':'built_in_rules_v2'};
}
async function ensureReferralCode(db:D1Database,userId:string){
 const existing=await db.prepare('SELECT code FROM referral_codes WHERE user_id=?').bind(userId).first<{code:string}>();if(existing)return existing.code;
 for(let attempt=0;attempt<4;attempt++){const code=crypto.randomUUID().replace(/-/g,'').slice(0,10).toUpperCase();try{await db.prepare('INSERT INTO referral_codes(code,user_id,created_at) VALUES(?,?,?) ON CONFLICT(user_id) DO NOTHING').bind(code,userId,now()).run();const saved=await db.prepare('SELECT code FROM referral_codes WHERE user_id=?').bind(userId).first<{code:string}>();if(saved)return saved.code;}catch{} }
 throw new ApiError(503,'Referral code is temporarily unavailable');
}
function referralCommission(amount:unknown,rateBasisPoints:number){return (BigInt(String(amount??0))*BigInt(rateBasisPoints)/10000n).toString();}
function malaysiaMarketingPhone(value:unknown){
 if(typeof value!=='string')return null;let digits=value.replace(/\D/g,'');
 if(digits.startsWith('60'))digits=digits.slice(2);if(digits.startsWith('0'))digits=digits.slice(1);
 if(!/^1\d{8,9}$/.test(digits))return null;return `+60${digits}`;
}
function csvCell(value:unknown){let text=String(value??'');if(/^[\t ]*[=+\-@]/.test(text))text=`'${text}`;return /[",\r\n]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;}
function marketingCsvResponse(db:D1Database,campaign:any,exportAt=now()){
 const encoder=new TextEncoder(),link=campaign.referral_code?`${CUSTOMER_ORIGIN}/register?ref=${encodeURIComponent(campaign.referral_code)}`:`${CUSTOMER_ORIGIN}/register`,imageUrl=campaign.image_data?`${CUSTOMER_ORIGIN}/api/marketing/campaign-image?campaign=${encodeURIComponent(campaign.id)}`:'',message=[campaign.message,campaign.benefit_text,link].filter(Boolean).join('\n'),pageSize=2000,maxRows=MARKETING_CONTACT_LIMIT,allowed=responsiblePlayMarketingAllowedSql('c',exportAt);let cursorCreated=-1,cursorId='',started=false,finished=false,emitted=0;
 const stream=new ReadableStream<Uint8Array>({async pull(controller){
  if(finished){controller.close();return;}
  try{
	   let chunk='';if(!started){chunk='\uFEFFphone,name,message,registration_link,image_url,unsubscribe_url\n';started=true;}
		   const result=await db.prepare(`SELECT c.id,c.created_at,c.phone,c.name,c.unsubscribe_token FROM marketing_contacts c WHERE c.consent_status='opted_in' AND c.unsubscribe_token IS NOT NULL AND c.unsubscribe_token<>'' AND ${allowed} AND (c.created_at>? OR (c.created_at=? AND c.id>?)) ORDER BY c.created_at,c.id LIMIT 2000`).bind(cursorCreated,cursorCreated,cursorId).all<any>(),items=(result.results??[]).slice(0,Math.max(0,maxRows-emitted));
	   if(items.length){chunk+=items.map((item:any)=>[item.phone,csvCell(item.name),csvCell(message),csvCell(link),csvCell(imageUrl),csvCell(`${CUSTOMER_ORIGIN}/unsubscribe?token=${encodeURIComponent(item.unsubscribe_token)}`)].join(',')).join('\n')+'\n';const last=items[items.length-1];cursorCreated=Number(last.created_at);cursorId=String(last.id);emitted+=items.length;}
   if(chunk)controller.enqueue(encoder.encode(chunk));if(items.length<pageSize||emitted>=maxRows){finished=true;controller.close();}
  }catch{finished=true;controller.error(new Error('Marketing export failed'));}
 }}),safeId=String(campaign.id).replace(/[^A-Za-z0-9_-]/g,'-').slice(0,80)||'campaign';
 return new Response(stream,{headers:{...responseHeaders,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="master7-campaign-${safeId}.csv"`}});
}
const vendorCategories=['SLOT','FAST GAME','LIVE','FISH','COCK','SPORT','OTHERS'] as const;
type VendorCategory=typeof vendorCategories[number];
const apiSupplierIds:string[]=[...GAME_PROVIDER_IDS];
const apiSupplierIdSet=new Set(apiSupplierIds);
const apiSupplierNames=GAME_PROVIDER_NAMES;
const automaticAvailability={availabilityMode:'automatic' as const,readOnlyAvailability:true as const};
const listedGameProfiles=GAME_PROVIDER_PROFILES.filter(profile=>profile.listedInLobby);
function publicGameProfile(profile:RegisteredGameProviderProfile,provider:any,position:number,profileCatalogue:any=null){
 const implemented=profile.implemented===true,mega=profile.profileId==='megah5_myr',launchReady=mega&&provider?.launchReady===true,walletReady=mega&&provider?.walletReady===true;
 const capabilityReason=mega?String(provider?.capabilityReason??'adapter_unavailable'):profile.adapterStatus;
 return {profileId:profile.profileId,providerId:profile.providerId,displayName:profile.displayName,walletMode:profile.walletMode,currency:profile.currency,unitScale:profile.unitScale,position,implemented,enabled:launchReady,launchReady,walletReady,recoveryReady:walletReady,launchVerified:mega&&provider?.launchVerified===true,walletVerified:mega&&provider?.walletVerified===true,settlementVerified:mega&&provider?.settlementVerified===true,capabilityReason,status:launchReady?'available':'unavailable',...(profileCatalogue??{catalogueProfileBound:false})};
}
function publicGameProfileDirectory(providers:any[],profileCatalogues=new Map<string,any>()){
 const byProvider=new Map(providers.map(provider=>[String(provider.id),provider])),profiles=listedGameProfiles.map((profile,index)=>publicGameProfile(profile,byProvider.get(profile.providerId),index+1,profileCatalogues.get(profile.profileId)));
 return {profiles,profileCount:profiles.length,profileBrandCount:new Set(profiles.map(profile=>profile.providerId)).size,implementedProfileCount:profiles.filter(profile=>profile.implemented).length,launchReadyProfileCount:profiles.filter(profile=>profile.launchReady).length,verifiedProfileCount:profiles.filter(profile=>profile.launchVerified&&profile.walletVerified&&profile.settlementVerified).length};
}
function attachGameProfiles(providers:any[],directory:ReturnType<typeof publicGameProfileDirectory>){return providers.map(provider=>{const profiles=directory.profiles.filter(profile=>profile.providerId===provider.id);return {...provider,profiles,profileCount:profiles.length};});}
async function publicSupplierControls(db:D1Database){
 const artwork=await rows(db,'SELECT provider_id,image_data,updated_at FROM api_supplier_artwork'),byId=new Map((artwork as any[]).map(item=>[String(item.provider_id),item]));
 // Legacy status and visible columns remain for export compatibility only.
 return apiSupplierIds.map(providerId=>{const art=byId.get(providerId) as any;return {provider_id:providerId,...automaticAvailability,image_updated_at:art?.image_data?art.updated_at:null};});
}
function catalogueReady(c:Context,provider:any){return provider?.connectionVerified===true&&provider?.catalogueSynced===true&&provider?.complete===true&&provider?.stale!==true&&gameCatalogueCacheFresh(c,Number(provider?.checkedAt));}
function providerCapability(c:Context,provider:any,games:any[],mega:MegaWalletCapability){
 const id=String(provider.id),connected=catalogueReady(c,provider),anyGame=games.some(game=>game.provider===id&&game.maintenance!==true),walletReady=id==='megah5'&&mega.walletReady,profiles=getGameProviderProfiles(id),adapterImplemented=profiles.some(profile=>profile.implemented),providerContractIncomplete=profiles.some(profile=>profile.implemented&&profile.contractStatus!=='documented');
 // A configured connection and a catalogue are not production acceptance.
 // Runtime capabilities carry independently recorded profile acceptance.
 const verified=id==='megah5'&&mega.catalogueVerified&&mega.launchVerified&&mega.walletVerified&&mega.settlementVerified&&mega.recoveryVerified;
 const launchReady=id==='megah5'&&mega.launchReady&&walletReady&&connected&&anyGame&&verified;
 const pendingAcceptance=id==='megah5'&&mega.launchReady&&walletReady&&connected&&anyGame&&!verified;
 const platformStatus=launchReady?'ready':pendingAcceptance?'awaiting_acceptance':games.length&&(!connected||!anyGame)?'maintenance':connected?(id==='megah5'?'catalogue_ready':adapterImplemented?'awaiting_acceptance':'awaiting_platform_adapter'):'awaiting_api';
 const capabilityReason=id==='megah5'?!connected?'catalogue_not_ready':!anyGame?'provider_maintenance':pendingAcceptance&&mega.capabilityReason==='ready'?'acceptance_pending':mega.capabilityReason:!adapterImplemented?'launch_wallet_adapter_not_implemented':!connected?'catalogue_or_provider_connection_pending':!anyGame?'provider_maintenance':providerContractIncomplete?'provider_contract_and_acceptance_pending':'profile_acceptance_pending';
 return {...provider,...automaticAvailability,operationalStatus:platformStatus,platformStatus,platformLaunchReady:launchReady,launchReady,walletReady,launchVerified:id==='megah5'&&mega.launchVerified,walletVerified:id==='megah5'&&mega.walletVerified,settlementVerified:id==='megah5'&&mega.settlementVerified,capabilitySource:id==='megah5'?mega.capabilitySource:'adapter_inventory',capabilityReason};
}
async function publicSupplierPlatforms(c:Context,capability?:MegaWalletCapability){
 const [cached,rankingState]=await Promise.all([rows(c.db,'SELECT provider_id,status,complete,checked_at,games_json FROM game_catalogue_cache'),loadGameRanking(c.db)]),mega=capability??cachedCatalogueCapability(c),cacheById=new Map((cached as any[]).map(item=>[String(item.provider_id),item])),configuredSources=new Set(configuredGameCatalogueSourceIds(c)),platforms=apiSupplierIds.map((id,index)=>{
  const cache=cacheById.get(defaultGameCatalogueCacheKey(id)) as any,cacheStatus=['available','empty','blocked','unavailable'].includes(String(cache?.status))?String(cache.status):'missing',fresh=!!cache&&gameCatalogueCacheFresh(c,Number(cache.checked_at)),connectionVerified=configuredSources.has(id)&&cacheStatus==='available'&&fresh;
  let games:any[]=[];try{const decoded=JSON.parse(String(cache?.games_json??'[]'));if(Array.isArray(decoded))games=decoded.slice(0,2000).filter(game=>game&&game.provider===id&&typeof game.gameCode==='string');}catch{}
  const provider={id,name:apiSupplierNames[id],position:index+1,connectionVerified,catalogueSynced:connectionVerified&&Number(cache?.complete)===1&&games.length>0,complete:Number(cache?.complete)===1,stale:!fresh||!connectionVerified,checkedAt:Number(cache?.checked_at??0),catalogueCacheStatus:cacheStatus,catalogueCacheFresh:fresh,cachedGameCount:games.length};
  return providerCapability(c,provider,games,mega);
 });
 if(capability)observeGameAvailability(c,platforms.some(provider=>provider.platformLaunchReady));
 const profileCatalogues=new Map<string,any>();for(const profile of listedGameProfiles){const cacheKey=gameCatalogueProfileCacheKey(profile.providerId,profile.profileId);if(!cacheKey)continue;const cache=cacheById.get(cacheKey) as any,cacheStatus=['available','empty','blocked','unavailable'].includes(String(cache?.status))?String(cache.status):'missing',fresh=!!cache&&gameCatalogueCacheFresh(c,Number(cache.checked_at)),connectionVerified=configuredSources.has(profile.providerId)&&cacheStatus==='available'&&fresh;let games:any[]=[];try{const decoded=JSON.parse(String(cache?.games_json??'[]'));if(Array.isArray(decoded))games=decoded.slice(0,2000).filter(game=>game&&game.provider===profile.providerId&&game.profileId===profile.profileId&&typeof game.gameCode==='string');}catch{}profileCatalogues.set(profile.profileId,{catalogueProfileBound:true,connectionVerified,catalogueSynced:connectionVerified&&Number(cache?.complete)===1&&games.length>0,complete:Number(cache?.complete)===1,stale:!fresh||!connectionVerified,checkedAt:Number(cache?.checked_at??0),catalogueCacheStatus:cacheStatus,catalogueCacheFresh:fresh,cachedGameCount:games.length});}
 const ranked=rankPlatforms(platforms,rankingState.ranking),directory=publicGameProfileDirectory(ranked,profileCatalogues),cachedGameCount=platforms.reduce((total,provider)=>total+provider.cachedGameCount,0),cachedProviderCount=platforms.filter(provider=>provider.catalogueCacheStatus!=='missing').length,providersWithCachedGames=platforms.filter(provider=>provider.cachedGameCount>0).length,freshCacheProviderCount=platforms.filter(provider=>provider.catalogueCacheFresh).length,completeCacheProviderCount=platforms.filter(provider=>provider.complete).length,missingCacheProviderCount=platforms.filter(provider=>provider.catalogueCacheStatus==='missing').length;
 return {providers:attachGameProfiles(ranked,directory),rankingState,...directory,cachedGameCount,catalogueCacheSummary:{source:'database_cache',cachedGameCount,cachedProviderCount,providersWithCachedGames,freshCacheProviderCount,completeCacheProviderCount,missingCacheProviderCount}};
}
async function gameArt(req:Request,c:Context){
 const search=new URL(req.url).searchParams,provider=search.get('provider')??'',gameCode=search.get('gameCode')??'',profileId=search.get('profileId')??undefined;
 if(!/^[A-Za-z0-9_-]{1,100}$/.test(gameCode)||!['megah5','918kissh5','evo888h5'].includes(provider)||profileId&&(provider!=='918kissh5'||!/^[A-Za-z0-9_-]{1,100}$/.test(profileId)))throw new ApiError(404,'Game artwork not found');
 const artwork=provider==='918kissh5'||provider==='evo888h5'?await cachedGameArtwork(c,provider,gameCode,profileId):`https://gth.megah5.com/thumbs/web/${encodeURIComponent(gameCode)}.png`;
 if(!artwork)throw new ApiError(404,'Game artwork not found');
 const source=new URL(artwork),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await (c.gameArtFetch??fetch)(source,{method:'GET',headers:{Accept:'image/avif,image/webp,image/png,image/*','User-Agent':'MASTER7-Game-Art/1.0','Referer':new URL(req.url).origin+'/'},redirect:'error',signal:controller.signal});
  const type=(response.headers.get('content-type')??'').split(';')[0].trim().toLowerCase(),declared=Number(response.headers.get('content-length')??0);
  if(!response.ok||!['image/png','image/jpeg','image/webp'].includes(type)||declared>1024*1024)throw new ApiError(404,'Game artwork not found');
  const bytes=await response.arrayBuffer();if(bytes.byteLength<16||bytes.byteLength>1024*1024)throw new ApiError(404,'Game artwork not found');
  return new Response(bytes,{headers:{'Content-Type':type,'Cache-Control':'public, max-age=86400, stale-while-revalidate=604800','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
 }catch(error){if(error instanceof ApiError)throw error;throw new ApiError(404,'Game artwork not found');}finally{clearTimeout(timer);}
}
async function gatewayGames(c:Context){return getGameCatalogue(c);}
function customerSupplierCatalogue(catalog:any){
 const games=(catalog.games??[]).filter((game:any)=>apiSupplierIdSet.has(String(game.provider))),sources=new Map((catalog.providers??[]).filter((provider:any)=>apiSupplierIdSet.has(String(provider.id))).map((provider:any)=>[String(provider.id),provider]));
 const providers=apiSupplierIds.map(id=>{const provider=sources.get(id) as any,count=games.filter((game:any)=>game.provider===id).length;return provider?{...provider,count}:{id,name:apiSupplierNames[id],status:'not_configured',count,catalogueSynced:false,connectionVerified:false,launchVerified:false,walletVerified:false,complete:false,stale:false,checkedAt:0,lastSuccessAt:0,upstreamStatus:null};});
 return {...catalog,games,providers};
}
function providerCatalogueLiveReady(c:Context,catalog:any,providerId:string,capability:MegaWalletCapability){
 const provider=(catalog.providers??[]).find((item:any)=>item.id===providerId),games=(catalog.games??[]).filter((game:any)=>game.provider===providerId);
 return !!provider&&providerCapability(c,provider,games,capability).launchReady;
}
async function applyGameVisibility(db:D1Database,catalog:any){
 const overrides=await rows(db,'SELECT provider_id,game_code,image_data,category_override,access_zone FROM game_visibility'),records=new Map(overrides.map((x:any)=>[`${x.provider_id}:${x.game_code}`,x]));
 const games=catalog.games.map((game:any)=>{
  const override=records.get(`${game.provider}:${game.gameCode||game.name}`) as any;
  return {...game,...automaticAvailability,status:game.maintenance?'suspended':'active',providerMaintenance:game.providerMaintenance??!!game.maintenance,categoryOverride:override?.category_override||'',accessZone:override?.access_zone==='free'?'free':'paid',imageData:override?.image_data||''};
 });
 return {...catalog,...automaticAvailability,games,providers:catalog.providers.map((provider:any)=>({...provider,...automaticAvailability,count:games.filter((game:any)=>game.provider===provider.id).length}))};
}
async function automaticCatalogue(c:Context,catalog:any,capability?:MegaWalletCapability){
 const [visible,mega]=await Promise.all([applyGameVisibility(c.db,customerSupplierCatalogue(catalog)),capability?Promise.resolve(capability):megaProviderCapability(c)]);
 const providers=visible.providers.map((provider:any)=>providerCapability(c,provider,visible.games.filter((game:any)=>game.provider===provider.id),mega)),ready=new Set(providers.filter((provider:any)=>provider.launchReady).map((provider:any)=>provider.id));
 const games=visible.games.map((game:any)=>({...game,playable:ready.has(game.provider)&&!game.maintenance}));
 if((catalog.providers??[]).some((provider:any)=>provider.id==='megah5'))observeGameAvailability(c,ready.has('megah5'),mega);
 return {...visible,providers,games,playable:games.some((game:any)=>game.playable)};
}
async function providerGameResponse(c:Context,user:User|null,payload:any){
 if(user?.role!=='member'||user.approved!==1||c.newGameLaunchesEnabled!=='true')return payload;
 const acceptance=await getGameProviderAcceptanceReadiness(c.db);
 let profiles=[...(payload.profiles??[])],providers=[...(payload.providers??[])],games=[...(payload.games??[])],readyProfile:string|null=null,readyProvider:string|null=null,productionReady=false,qaReady=false;
 for(const profile of listedGameProfiles.filter(transferProfileSupported)){
  const selected=payload.selectedProvider===profile.providerId,summary=payload.selectedProvider===null;
  if(!summary&&!selected)continue;
  // Multi-account brands require the exact account selected by the member.
  if(selected&&payload.selectedProfileId&&payload.selectedProfileId!==profile.profileId)continue;
  if(selected&&!payload.selectedProfileId&&getGameProviderProfiles(profile.providerId).filter(p=>p.listedInLobby).length!==1)continue;
  const accepted=acceptance.profiles.find(item=>item.profileId===profile.profileId),runtime=gameTransferRuntime(c,profile.profileId,user.id,accepted?.evidenceAccepted===true),provider=providers.find((item:any)=>item.id===profile.providerId),profileState=profiles.find((item:any)=>item.profileId===profile.profileId),catalogueState=summary&&profileState?.catalogueProfileBound===true?profileState:provider;
  const available=selected?games.some((game:any)=>game.provider===profile.providerId&&game.maintenance!==true):Number(catalogueState?.cachedGameCount??0)>0;
  if(!runtime?.launchAuthorized||!provider||!catalogueReady(c,catalogueState)||!available){observeTransferAvailability(c,profile.profileId,false);continue;}
  const production=runtime.mode==='production',qaOnly=runtime.mode==='qa',capabilities=accepted?.capabilities??{},reason=qaOnly?'restricted_qa':'profile_acceptance_ready';
  if(production)observeTransferAvailability(c,profile.profileId,true);
  profiles=profiles.map((p:any)=>p.profileId===profile.profileId?{...p,enabled:true,qaOnly,launchReady:true,walletReady:true,recoveryReady:true,launchVerified:production&&capabilities.launch===true,walletVerified:production&&capabilities.wallet===true,settlementVerified:production&&capabilities.settlement===true,status:qaOnly?'qa':'available',capabilityReason:reason}:p);
  providers=providers.map((p:any)=>p.id===profile.providerId?{...p,qaOnly,launchReady:true,walletReady:true,platformLaunchReady:true,launchVerified:production&&capabilities.launch===true,walletVerified:production&&capabilities.wallet===true,settlementVerified:production&&capabilities.settlement===true,platformStatus:qaOnly?'restricted_qa':'ready',capabilityReason:reason}:p);
  games=games.map((game:any)=>game.provider===profile.providerId&&!game.maintenance?{...game,profileId:profile.profileId,qaOnly,playable:true}:game);
  readyProfile??=profile.profileId;readyProvider??=profile.providerId;productionReady||=production;qaReady||=qaOnly;
 }
 if(!readyProfile)return payload;
 providers=providers.map((p:any)=>({...p,profiles:profiles.filter((item:any)=>item.providerId===p.id)}));
 const selected=payload.selectedProvider!==null,preferCurrent=!selected&&payload.launchProvider;
 return {...payload,profiles,providers,games,qaOnly:qaReady&&!productionReady,launchReadyProfileCount:profiles.filter((profile:any)=>profile.launchReady===true).length,verifiedProfileCount:profiles.filter((profile:any)=>profile.launchVerified===true&&profile.walletVerified===true&&profile.settlementVerified===true).length,selectedPlatform:selected?providers.find((p:any)=>p.id===payload.selectedProvider):payload.selectedPlatform,selectedProfile:selected?profiles.find((p:any)=>p.profileId===readyProfile):payload.selectedProfile,playable:true,liveReady:productionReady||payload.liveReady===true,launchProvider:preferCurrent?payload.launchProvider:readyProvider,launchProfile:preferCurrent?payload.launchProfile:readyProfile};
}
function launchClientIp(req:Request){
 const candidates=[req.headers.get('cf-connecting-ip'),...(req.headers.get('x-forwarded-for')??'').split(',')];
 return candidates.map(value=>value?.trim()??'').find(value=>{const parts=value.split('.');return parts.length===4&&parts.every(part=>/^\d{1,3}$/.test(part)&&Number(part)<=255);})??'';
}
function gameProfileUnavailable(profile:RegisteredGameProviderProfile){
 const reason=profile.adapterStatus==='adapter_unimplemented'?'adapter_unimplemented':'contract_missing';
 return json({error:'Game provider is unavailable',code:'GAME_PROVIDER_UNAVAILABLE',reason,profileId:profile.profileId,providerId:profile.providerId},503);
}
function invalidGameProfile(code:string,reason:string,status=400){return json({error:'Invalid game profile',code,reason},status);}
function bodyProfileId(d:any){
 const profile=typeof d?.profile==='string'?d.profile.trim():'',profileId=typeof d?.profileId==='string'?d.profileId.trim():'';
 if(profile&&profileId&&profile!==profileId)return {error:invalidGameProfile('GAME_PROFILE_CONFLICT','profile_fields_mismatch')};
 return {profileId:profileId||profile||null};
}
function resolveLaunchProfile(d:any):{profile:RegisteredGameProviderProfile|null;error:Response|null}{
 const requested=bodyProfileId(d);if(requested.error)return {profile:null,error:requested.error};
 const rawProvider=typeof d?.providerId==='string'?d.providerId.trim():'';
 if(rawProvider&&!apiSupplierIdSet.has(rawProvider))return {profile:null,error:invalidGameProfile('GAME_PROVIDER_INVALID','provider_not_registered')};
 let profile=requested.profileId?getGameProviderProfile(requested.profileId):null;
 if(requested.profileId&&!profile)return {profile:null,error:invalidGameProfile('GAME_PROFILE_INVALID','profile_not_registered')};
 if(profile&&rawProvider&&profile.providerId!==rawProvider)return {profile:null,error:invalidGameProfile('GAME_PROFILE_PROVIDER_MISMATCH','profile_provider_mismatch')};
 if(!profile){
  if(!rawProvider)return {profile:null,error:json({error:'Invalid game provider'},400)};
  const profiles=getGameProviderProfiles(rawProvider).filter(item=>item.listedInLobby);
  if(profiles.length!==1)return {profile:null,error:invalidGameProfile('GAME_PROFILE_REQUIRED','multiple_profiles')};
  profile=profiles[0];
 }
 if(!profile.listedInLobby||!profile.implemented||profile.profileId!=='megah5_myr'&&!transferProfileSupported(profile))return {profile:null,error:gameProfileUnavailable(profile)};
 return {profile,error:null};
}
function resolveWalletProfile(value:any):{profile:RegisteredGameProviderProfile|null;error:Response|null}{
 const requested=bodyProfileId(value);if(requested.error)return {profile:null,error:requested.error};
 const profileId=requested.profileId??'megah5_myr',profile=getGameProviderProfile(profileId);
 if(!profile)return {profile:null,error:invalidGameProfile('GAME_PROFILE_INVALID','profile_not_registered')};
 if(!profile.implemented||profile.profileId!=='megah5_myr'&&!transferProfileSupported(profile))return {profile:null,error:gameProfileUnavailable(profile)};
 return {profile,error:null};
}
function queryProfileId(search:URLSearchParams){
 const profile=search.get('profile')?.trim()??'',profileId=search.get('profileId')?.trim()??'';
 if(profile&&profileId&&profile!==profileId)throw new ApiError(400,'Conflicting game profile');
 return profileId||profile||null;
}
async function launchMegaH5(req:Request,c:Context,u:User,d:any){
 const gameCode=textField(d.gameCode,1,100);if(!/^\d{1,12}$/.test(gameCode))throw new ApiError(400,'Invalid MegaH5 game');
 if(c.gameGatewayUrl!=='https://master7-integration-gateway.onrender.com'||!c.gameGatewayToken||Buffer.byteLength(c.gameGatewayToken)<32)throw new ApiError(503,'MegaH5 launch connection is not active');
 const capability=await megaProviderCapability(c);if(!capability.launchReady||!capability.walletReady)throw new ApiError(503,'MegaH5 launch or transfer/recovery capability is unavailable');
 // Until launch, wallet and settlement have independent real acceptance, new
 // launches remain closed. Existing settlement and recovery routes stay active.
 if(!capability.catalogueVerified||!capability.launchVerified||!capability.walletVerified||!capability.settlementVerified||!capability.recoveryVerified)throw new ApiError(503,'MegaH5 game acceptance is pending');
 const catalogue=await applyGameVisibility(c.db,await getGameCatalogue(c,{providerId:'megah5'})),game=catalogue.games.find((item:any)=>item.provider==='megah5'&&item.gameCode===gameCode);
 if(!providerCatalogueLiveReady(c,catalogue,'megah5',capability)||!game||game.maintenance===true)throw new ApiError(409,'Game is unavailable or under maintenance');
 const ip=launchClientIp(req);if(!ip)throw new ApiError(400,'Player network address is unavailable');
 const walletContext=megaWalletSettings(c,u),prepared=await prepareMegaWallet(walletContext,gameCode);
 if(!prepared.sessionId)throw new ApiError(409,'Game wallet session is unavailable');
 // Persist ownership of the attempt before GameLogin. Until a provider-backed
 // close contract exists, even an issued URL does not permit wallet settlement.
 const launch=await claimMegaLaunch(walletContext,prepared.sessionId,gameCode);
 const playerId=`m7_${createHash('sha256').update(u.id).digest('hex').slice(0,32)}`,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await(c.gameGatewayFetch??fetch)(`${c.gameGatewayUrl}/platform/megah5/session`,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:`Bearer ${c.gameGatewayToken}`},body:JSON.stringify({playerId,gameCode,ip,lang:'en-us'}),redirect:'error',signal:controller.signal});
  const type=response.headers.get('content-type')??'';if(!response.ok||response.redirected||!/^application\/json(?:;|$)/i.test(type))throw new ApiError(502,'MegaH5 launch was rejected');
  const raw=await response.text();if(Buffer.byteLength(raw)>65536)throw new ApiError(502,'MegaH5 launch response is invalid');let result:any;try{result=JSON.parse(raw);}catch{throw new ApiError(502,'MegaH5 launch response is invalid');}
  if(result?.provider!=='megah5'||![200,'200'].includes(result?.result?.Status))throw new ApiError(502,'MegaH5 launch response is unconfirmed');
  const urlValue=result?.result?.Url??result?.result?.URL??result?.result?.GameUrl??result?.result?.GameURL;let launchUrl:URL;try{launchUrl=new URL(String(urlValue??''));}catch{throw new ApiError(502,'MegaH5 launch URL is missing');}
  if(!megaLaunchOriginAllowed(c.megaLaunchOriginsJson,launchUrl))throw new ApiError(502,'MegaH5 launch URL is invalid');
  await markMegaLaunchIssued(walletContext,launch.id,prepared.sessionId);
  await auditStmt(c.db,u,'game_launch_created',`megah5:${gameCode}`).run();return json({provider:'megah5',profileId:'megah5_myr',gameCode,launchUrl:launchUrl.href,walletVerified:prepared.walletVerified,walletSessionId:prepared.sessionId,settlementBlocked:!(c.megaClosureContractVerified===true&&typeof c.megaSessionCloser==='function'),amountInGameMinor:prepared.amountOutMinor});
 }catch(error){
  // A timeout, malformed reply or even an upstream error cannot establish
  // that GameLogin was not executed. Keep the durable attempt for review.
  try{await markMegaLaunchUnknown(walletContext,launch.id,prepared.sessionId);}catch{/* The existing launching/issued row remains fail-closed. */}
  if(error instanceof ApiError||error instanceof MegaWalletError)throw error;throw new ApiError(503,'MegaH5 launch is temporarily unavailable');
 }finally{clearTimeout(timer);}
}
async function launchProviderGame(req:Request,c:Context,u:User,d:any,profile:RegisteredGameProviderProfile){
 if(profile.profileId==='megah5_myr'&&profile.providerId==='megah5')return launchMegaH5(req,c,u,d);
 if(!transferProfileSupported(profile))return gameProfileUnavailable(profile);
 const gameCode=textField(d.gameCode,1,100),settings=await transferSettings(c,u,profile);
 if(!settings.launchAuthorized)throw new ProviderTransferError(503,'GAME_ACCEPTANCE_REQUIRED');
 const catalogue=await applyGameVisibility(c.db,await getGameCatalogue(c,{providerId:profile.providerId,profileId:profile.profileId})),provider=catalogue.providers.find((item:any)=>item.id===profile.providerId),game=catalogue.games.find((item:any)=>item.provider===profile.providerId&&item.gameCode===gameCode);
 if(!catalogueReady(c,provider)||!game||game.maintenance===true)throw new ProviderTransferError(409,'GAME_CATALOGUE_UNAVAILABLE');
 const runtime=gameTransferRuntime(c,profile.profileId,u.id,settings.launchAuthorized);
 if(!runtime||!await seedTransferProfile(c.db,runtime))throw new ProviderTransferError(409,'GAME_PROFILE_RECONCILIATION_REQUIRED');
 return json(await launchTransferWallet(settings,{gameCode,requestKey:textField(d.idempotencyKey??d.requestKey,1,200),language:['en','zh','ms'].includes(d.language)?d.language:'en',ip:launchClientIp(req),returnUrl:CUSTOMER_ORIGIN+'/'}));
}

const depositConflictCodes=new Set(['SELF_EXCLUSION_ACTIVE','COOLING_OFF_ACTIVE','DAILY_DEPOSIT_LIMIT','WEEKLY_DEPOSIT_LIMIT','MONTHLY_DEPOSIT_LIMIT','DEPOSIT_LIMIT','DEPOSIT_REQUEST_IN_PROGRESS','IDEMPOTENCY_CONFLICT']);
function depositOrderProvider(req:Request){return req.method==='POST'?new URL(req.url).pathname.match(/^\/api\/payments\/(vpay|gspay|1mpay)\/orders$/)?.[1]:undefined;}
function logDepositOrderConflict(req:Request,status:number,value:unknown){
 const provider=depositOrderProvider(req);if(status!==409||!provider)return;
 // Fixed fields and an allowlisted code only: never log the request, customer,
 // amount, idempotency key, provider response, credentials or checkout URL.
 const code=typeof value==='string'&&depositConflictCodes.has(value)?value:'ORDER_CONFLICT';
 console.warn(JSON.stringify({event:'payment_order_conflict',provider,httpStatus:409,code}));
}
export async function handle(req:Request,c:Context):Promise<Response>{
 try{
  const response=await route(req,c);
  if(response.status===409&&depositOrderProvider(req)){
   const payload:unknown=await response.clone().json().catch(()=>null);
   const detail=payload&&typeof payload==='object'&&!Array.isArray(payload)?payload as Record<string,unknown>:null;
   logDepositOrderConflict(req,response.status,detail?.code??detail?.error);
  }
  return response;
 }catch(e){
  if(e instanceof ManualComplianceError)return json({error:e.message,code:e.code},e.status);
  if(e instanceof ProviderTransferError)return json({error:e.message,code:e.code},e.status);
  if(e instanceof GameProviderAcceptanceError)return json({error:e.message,code:e.code},e.status);
  if(e instanceof JdbWagerCoverageError)return json({error:e.message,code:e.code},e.status);
  if(e instanceof ProductionAcceptanceError)return json({error:e.message,code:e.code},e.status);
  if(e instanceof ResponsiblePlayError){logDepositOrderConflict(req,e.status,e.code);return json({error:e.message,code:e.code},e.status);}
  if(e instanceof ApiError||e instanceof AuthError||e instanceof BackupOperationsError||e instanceof MegaWalletError||e instanceof RewardStateError||e instanceof VipError||e instanceof RewardsHubError||e instanceof GameRankingError||e instanceof BonusRiskError||e instanceof EngagementError||e instanceof WhatsAppCampaignError)return json({error:e.message},e.status);
  const code=e&&typeof e==='object'&&'code'in e&&typeof e.code==='string'&&/^[A-Z0-9]{5}$/.test(e.code)?e.code:'unknown';console.error('MASTER7 API unavailable',e instanceof Error?e.name:'Error',code);return json({error:'服务暂时不可用 / Service temporarily unavailable'},503);
 }
}
async function route(req:Request,c:Context){
 const p=new URL(req.url).pathname,db=c.db;
 if(req.method==='GET'&&p==='/health/live'){await db.prepare('SELECT id FROM users LIMIT 1').all();return json({status:'ok',release:RELEASE,database:'ready',scope:'portal-liveness'});}
 if(req.method==='GET'&&(p==='/health'||p==='/api/version')){await db.prepare('SELECT id FROM users LIMIT 1').all();const megaWalletCredentialsConfigured=c.gameGatewayUrl==='https://master7-integration-gateway.onrender.com'&&!!c.gameGatewayToken&&!!c.gameGatewayWalletToken&&c.gameGatewayToken!==c.gameGatewayWalletToken&&Buffer.byteLength(c.gameGatewayToken)>=32&&Buffer.byteLength(c.gameGatewayWalletToken)>=32,{payments,readiness}=await canonicalOperationsReadiness(c),megaAcceptance=readiness.gameAcceptance.profiles.find(profile=>profile.profileId==='megah5_myr'),megaLiveReady=megaAcceptance?.effectiveReady===true,smsOtpReady=!!(c.anchorApiBaseUrl&&c.anchorUsername&&c.anchorPassword&&c.anchorSenderId&&c.otpHashSecret&&c.otpHashSecret.length>=32),productionReady=readiness.productionReady,acceptanceIntegrityReady=readiness.gameAcceptance.integrityReady===true&&readiness.productionAcceptance.integrityReady===true,readinessBlockers=[...(!acceptanceIntegrityReady?['acceptance_integrity_failed']:[]),...(!payments.realPayments?['deposit_provider_not_ready']:[]),...(!payments.payoutsEnabled?['payout_provider_not_ready']:[]),...(!payments.settlementVerified?['payment_settlement_not_verified']:[]),...(!readiness.gamesReady?['game_launch_or_settlement_not_ready']:[]),...(!readiness.backupReady?['encrypted_backup_not_ready']:[]),...(!readiness.restoreReady?['restore_rehearsal_not_verified']:[]),...(!readiness.productionAcceptance.domainReady?['official_domain_tls_not_verified']:[]),...(!readiness.productionAcceptance.credentialRotationReady?['credential_rotation_not_verified']:[]),...(!readiness.productionAcceptance.signoffReady?['production_signoff_not_verified']:[])];return json({status:'ok',release:RELEASE,sourceRelease:SOURCE_RELEASE,database:'ready',smsOtpReady,mode:'selfbuilt-service-portal',...payments,providerAcceptance:{integrityReady:readiness.gameAcceptance.integrityReady,requiredProfileCount:readiness.gameAcceptance.requiredProfileCount,acceptedProfileCount:readiness.gameAcceptance.acceptedProfileCount,liveProfileCount:readiness.gameAcceptance.liveProfileCount,allAcceptanceEvidencePassed:readiness.gameAcceptance.allAcceptanceEvidencePassed,allGamesVerified:readiness.allGamesVerified},externalAcceptance:{integrityReady:readiness.productionAcceptance.integrityReady,domainReady:readiness.productionAcceptance.domainReady,credentialRotationReady:readiness.productionAcceptance.credentialRotationReady,paymentReady:readiness.productionAcceptance.paymentReady,signoffReady:readiness.productionAcceptance.signoffReady},acceptanceIntegrityReady,backupReady:readiness.backupReady,restoreReady:readiness.restoreReady,backupCreatedAt:readiness.backupCreatedAt,restoreVerifiedAt:readiness.restoreVerifiedAt,megaWallet:{configured:megaWalletCredentialsConfigured,...automaticAvailability,enabled:megaLiveReady,liveGamesEnabled:megaLiveReady,launchReady:readiness.megaAvailable,launchVerified:megaAcceptance?.capabilities.launch===true,walletVerified:megaAcceptance?.capabilities.wallet===true,settlementVerified:megaAcceptance?.capabilities.settlement===true,recoveryVerified:megaAcceptance?.capabilities.recovery===true,liveReady:megaLiveReady},liveGames:readiness.gamesReady,anyGamePlayable:readiness.gameAcceptance.anyGamePlayable,productionReady,readinessBlockers,scope:'portal-database-health'});}
 if(p==='/api/jobs/backup'){
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  if(!authorizedBearer(req,c.backupJobToken))return json({error:'Access denied'},401);
  if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return json({error:'JSON required'},415);
  const d=await body(req,24000);
  if(d.action==='record_rehearsal'){const result=await recordPortalRestoreRehearsal(db,RELEASE,'system:backup-job',d);return json({status:'ok',verified:true,...(result.idempotent?{idempotent:true}:{})});}
  if(d.action!=='create')throw new ApiError(400,'Invalid backup action');const backup=await createPortalBackup(db,RELEASE,'system:backup-job');return new Response(backup.serialized,{headers:{...responseHeaders,'Content-Disposition':`attachment; filename="${backup.filename}"`}});
 }
 if(req.method==='GET'&&p==='/api/internal/catalogue-sync'){const token=c.gameSyncToken??'',auth=req.headers.get('authorization')??'',given=auth.startsWith('Bearer ')?auth.slice(7):'';if(token.length<32||Buffer.byteLength(given)!==Buffer.byteLength(token)||!timingSafeEqual(Buffer.from(given),Buffer.from(token)))return json({error:'Access denied'},401);const catalogue=customerSupplierCatalogue(await getGameCatalogue(c));return json({providers:catalogue.providers,gameCount:catalogue.games.length,playable:false});}
 if(req.method==='POST'&&p==='/api/internal/accounting-close'){
  const token=c.accountingJobToken??'',auth=req.headers.get('authorization')??'',given=auth.startsWith('Bearer ')?auth.slice(7):'';
  if(token.length<32||Buffer.byteLength(given)!==Buffer.byteLength(token)||!timingSafeEqual(Buffer.from(given),Buffer.from(token)))return json({error:'Access denied'},401);
  const payload=await body(req,2048),date=payload.date,periodStart=date===undefined?undefined:(typeof date==='string'?mytDateStart(date):null);if(date!==undefined&&periodStart===null)throw new ApiError(400,'Invalid MYT accounting date');
  const rawKey=req.headers.get('idempotency-key')??'',jobKey=rawKey&&/^[A-Za-z0-9:_-]{1,128}$/.test(rawKey)?rawKey:undefined;if(rawKey&&!jobKey)throw new ApiError(400,'Invalid idempotency key');
  return json(await runAccountingCatchUp(db,now(),{periodStart:periodStart??undefined,jobKey}));
 }
 if(p==='/api/marketing/whatsapp/webhook'){
  if(req.method==='GET'){const result=whatsappWebhookChallenge(req.url,whatsappCampaignSettings(c));return result.ok?new Response(result.challenge,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}}):json({error:'Webhook verification failed'},403);}
  if(req.method==='POST'){if(!req.headers.get('content-type')?.startsWith('application/json'))throw new ApiError(415,'JSON required');const raw=await rawBody(req);return json({status:'ok',...await applyWhatsAppWebhook(whatsappCampaignSettings(c),raw,req.headers.get('x-hub-signature-256'))});}
  throw new ApiError(405,'Method not allowed');
 }
 if(req.method==='POST'&&p==='/api/internal/whatsapp-dispatch'){
  const settings=whatsappCampaignSettings(c);if(!authorizeWhatsAppWorker(req.headers.get('authorization'),settings))return json({error:'Access denied'},401);
  return json({status:'ok',...await dispatchWhatsAppCampaigns(settings)});
 }
  if(req.method==='POST'&&p==='/api/internal/payment-recovery'){
  const token=c.paymentRecoveryToken??'',auth=req.headers.get('authorization')??'',given=auth.startsWith('Bearer ')?auth.slice(7):'';
  const tokenBytes=Buffer.byteLength(token);if(tokenBytes<32||tokenBytes>1024||Buffer.byteLength(given)!==tokenBytes||!timingSafeEqual(Buffer.from(given),Buffer.from(token)))return json({error:'Access denied'},401);
  const scope=new URL(req.url).searchParams.getAll('provider');if(scope.length>1||(scope.length===1&&scope[0]!=='1mpay'))return json({error:'Invalid recovery scope'},400);
  if(scope[0]==='1mpay'){const oneMpay=await recoverOneMpayDeposits(oneMpaySettings(c,null));return json({providerStatusQueries:true,scope:'1mpay',newOrdersChanged:false,payoutsSubmitted:false,providers:{'1mpay':oneMpay},payouts:{}});}
  const [vpay,gspay,oneMpay,vpayPayouts,gspayPayouts]=await Promise.all([recoverVPayDeposits(vpaySettings(c,null)),recoverGSPayDeposits(gspaySettings(c,null)),recoverOneMpayDeposits(oneMpaySettings(c,null)),recoverVPayPayouts(vpayPayoutSettings(c)),recoverGSPayPayouts(gspaySettings(c,null))]);
  return json({providerStatusQueries:true,newOrdersChanged:false,payoutsSubmitted:false,providers:{vpay,gspay,'1mpay':oneMpay},payouts:{vpay:vpayPayouts,gspay:gspayPayouts,'1mpay':{enabled:false,reason:'Payout contract is not verified'}}});
 }
 if(p==='/api/internal/deposit-incidents'||p==='/api/internal/deposit-incidents/1mpay-query'||p==='/api/internal/deposit-incidents/vpay-query'||p==='/api/internal/deposit-incidents/operations'){
  if(!authorizeDepositIncidentRead(req.headers.get('authorization'),c.depositIncidentTokenHash,c.depositIncidentExpiresAt))return json({error:'Access denied'},401);
  if(req.method!=='GET')return json({error:'Method not allowed'},405);
  if(new URL(req.url).search)return json({error:'Invalid incident scope'},400);
  if(p==='/api/internal/deposit-incidents/operations'){
   const long=(value:unknown)=>typeof value==='string'&&value.length>=32;
   const recoveryBytes=typeof c.paymentRecoveryToken==='string'?Buffer.byteLength(c.paymentRecoveryToken):0;
   return json({release:RELEASE,readOnly:true,configuredOnly:true,jobs:{catalogueSync:{credentialConfigured:long(c.gameSyncToken),intervalMs:60000},accountingClose:{credentialConfigured:long(c.accountingJobToken),intervalMs:300000},paymentRecovery:{credentialConfigured:recoveryBytes>=32&&recoveryBytes<=1024,providers:{vpay:c.vpayRecoveryEnabled==='true',gspay:c.gspayRecoveryEnabled==='true','1mpay':c.oneMpayRecoveryEnabled==='true'},scope:'existing_orders_only'}}});
  }
  if(p==='/api/internal/deposit-incidents/vpay-query')return json({release:RELEASE,evidence:await readVPayDepositProviderEvidence(vpaySettings(c,null))});
  if(p==='/api/internal/deposit-incidents/1mpay-query')return json({release:RELEASE,evidence:await readOneMpayDepositProviderEvidence(oneMpaySettings(c,null))});
  const source=db as D1Database&{readDepositIncidents?:()=>Promise<unknown>};
  if(typeof source.readDepositIncidents!=='function')return json({error:'Incident snapshot unavailable'},503);
  return json({release:RELEASE,sourceRelease:SOURCE_RELEASE,evidence:await source.readDepositIncidents()});
 }
 if(req.method==='GET'&&p==='/api/game-art')return gameArt(req,c);
 if(!['GET','POST'].includes(req.method))throw new ApiError(405,'Method not allowed');
 if(p==='/api/marketing/unsubscribe'){
  const tokenFrom=(value:unknown)=>{if(typeof value!=='string'||!/[a-f0-9]{32}/i.test(value)||value.length!==32)throw new ApiError(400,'Invalid unsubscribe link');return value.toLowerCase();};
  if(req.method==='GET'){const token=tokenFrom(new URL(req.url).searchParams.get('token')),contact=await db.prepare('SELECT consent_status FROM marketing_contacts WHERE unsubscribe_token=?').bind(token).first<{consent_status:string}>();if(!contact)throw new ApiError(404,'Unsubscribe link not found');return json({valid:true,optedOut:contact.consent_status==='opted_out'});}
  if(!requestOriginAllowed(req,c.allowedOrigins))throw new ApiError(403,'Origin denied');const data=await body(req,2048),token=tokenFrom(data.token),contact=await db.prepare('SELECT id,consent_status FROM marketing_contacts WHERE unsubscribe_token=?').bind(token).first<{id:string;consent_status:string}>();if(!contact)throw new ApiError(404,'Unsubscribe link not found');const stamp=now();await db.batch([db.prepare("UPDATE marketing_contacts SET consent_status='opted_out',consented_at=NULL,consent_source='self_service_unsubscribe',consent_proof='Recipient confirmed unsubscribe',updated_at=? WHERE id=?").bind(stamp,contact.id),db.prepare("UPDATE marketing_deliveries SET status='opted_out',claim_token=NULL,locked_until=0,updated_at=? WHERE contact_id=? AND status IN ('queued','submitting','unknown','failed')").bind(stamp,contact.id),db.prepare('INSERT INTO audit(id,user_id,event,target,created_at) VALUES(?,?,?,?,?)').bind(uuid(),'public-unsubscribe','marketing_contact_opted_out',token.slice(-8),stamp)]);return json({status:'ok',optedOut:true});
 }
 const gspayCallback=await handleGSPayCallback(req,gspaySettings(c,null));
 if(gspayCallback)return gspayCallback;
 const vpayPayoutCallback=await handleVPayPayoutCallback(req,vpayPayoutSettings(c));
 if(vpayPayoutCallback)return vpayPayoutCallback;
 const local=await readLocalSession(req,db);
 if(p.startsWith('/api/auth/'))return handlePasswordAuth(req,c,local);
 const u=local?.user??await currentUser(c,p==='/api/session'&&req.method==='GET');
 if(p==='/api/admin/jdb-wager-coverage'&&req.method!=='GET')throw new ApiError(405,'Method not allowed');
 if(p==='/api/admin/operations-intelligence'&&req.method!=='GET')throw new ApiError(405,'Method not allowed');
 const gspayUsdtResponse=handleGSPayUsdtStatus(req,gspayUsdtSettings(c));
 if(gspayUsdtResponse)return gspayUsdtResponse;
 const statusControl=p==='/api/payments/vpay/status'||p==='/api/payments/gspay/status'||p==='/api/payments/1mpay/status'?await depositControls(db):null;
 const acceptance=statusControl?await getProductionAcceptanceReadiness(db):null;
 const statusContext=statusControl?{...c,vpayOrdersEnabled:statusControl.vpay==='paused'?'false':c.vpayOrdersEnabled,gspayOrdersEnabled:statusControl.gspay==='paused'?'false':c.gspayOrdersEnabled,oneMpayOrdersEnabled:statusControl['1mpay']==='paused'?'false':c.oneMpayOrdersEnabled}:c;
 const acceptanceFor=(profile:string)=>({realPaymentVerified:acceptance?.paymentProfiles?.[profile]===true,settlementVerified:acceptance?.paymentProfiles?.[profile]===true});
 const gspayContext=gspaySettings(statusContext,u,acceptanceFor('gspay_myr'));
 const gspayResponse=await handleGSPay(req,gspayContext);
 if(gspayResponse)return gspayResponse;
 const vpayContext=vpaySettings(statusContext,u,acceptanceFor('vpay_myr'));
 const vpayResponse=await handleVPay(req,vpayContext);
 if(vpayResponse)return vpayResponse;
 const oneMpayContext=oneMpaySettings(statusContext,u,acceptanceFor('onempay_myr'));
 const oneMpayResponse=await handleOneMpay(req,oneMpayContext);
 if(oneMpayResponse)return oneMpayResponse;
  if(req.method==='GET'&&p==='/api/manual-bank/accounts'&&(c.newDepositsEnabled!=='true'||(await depositControls(db)).manual_bank==='paused')){role(u,['member']);if(!u.approved)throw new ApiError(403,'Account awaiting approval');return json({items:[],maintenance:true});}
  if(req.method==='GET'){const payout=await manualBankPayoutGet(req,{db,user:u,dataKey:c.withdrawalDataKey,newPayoutsEnabled:c.newPayoutsEnabled});if(payout)return payout;const manual=await manualBankGet(req,{db,user:u,newDepositsEnabled:c.newDepositsEnabled,newPayoutsEnabled:c.newPayoutsEnabled});if(manual)return manual;}
 if(req.method==='GET'){
  if(p==='/api/session')return json({user:u?{id:u.id,username:u.username,role:u.role,approved:!!u.approved}:null,csrf:u?.csrf??null,authMethod:u?(local?'password':'chatgpt'):null});
	  if(p==='/api/compliance'){role(u,['member']);return json({...await getManualCompliance(db,u.id),enforcementEnabled:c.manualComplianceEnforced==='true'});}
	  if(p==='/api/admin/compliance'){role(u,['owner']);const items=await rows(db,"SELECT r.user_id,u.username,r.identity_status,r.aml_status,r.version,r.updated_at FROM manual_compliance_reviews r JOIN users u ON u.id=r.user_id WHERE u.role='member' ORDER BY r.updated_at ASC,r.user_id LIMIT 200");return json({items,manualReview:true,automatedScreening:false});}
	  if(p==='/api/vip')return json(await getPublicVip(db,u?.role==='member'?u.id:null,await referralSettings(db)));
	  if(p==='/api/rewards')return json(await getRewardsHub(db,u?.role==='member'?u.id:null));
	  if(p==='/api/engagement')return json(await getPublicEngagement(db));
	  if(p==='/api/responsible-play'){role(u,['member']);if(!u.approved)throw new ApiError(403,'Account awaiting approval');return json(await getResponsiblePlay(db,u.id));}
  if(p==='/api/referral'){
   role(u,['owner']);const code=await ensureReferralCode(db,u.id),config=await referralSettings(db);
   const items=await rows(db,"SELECT r.member_id,u.username,u.approved,r.created_at,CAST(COALESCE(SUM(CASE WHEN d.status='credited' THEN d.amount_minor ELSE 0 END),0) AS TEXT) deposit_minor,COUNT(DISTINCT CASE WHEN d.status='credited' THEN d.id END) deposit_orders FROM referral_relationships r JOIN users u ON u.id=r.member_id LEFT JOIN deposit_orders d ON d.user_id=r.member_id WHERE r.referrer_id=? GROUP BY r.member_id,u.username,u.approved,r.created_at ORDER BY r.created_at DESC LIMIT 500",u.id);
   const canCalculate=config.configured&&config.enabled&&config.basis==='deposit',creditedMinor=items.reduce((sum:any,item:any)=>sum+BigInt(String(item.deposit_minor??0)),0n).toString(),commissionMinor=canCalculate?referralCommission(creditedMinor,config.rateBasisPoints):'0';
   return json({code,link:`${CUSTOMER_ORIGIN}/register?ref=${encodeURIComponent(code)}`,configured:config.configured,enabled:config.enabled,basis:config.basis,basisReady:config.basis==='deposit',rateBasisPoints:config.rateBasisPoints,ratePercent:config.rateBasisPoints/100,referredCount:items.length,creditedMinor,commissionMinor,commissionEstimateType:'l1_all_time_gross_preview',commissionWithdrawable:false,walletCreditAutomation:false,state:canCalculate?'preview_only':config.configured?'disabled':'not_configured',items:items.map((item:any)=>({...item,commission_minor:canCalculate?referralCommission(item.deposit_minor,config.rateBasisPoints):'0'}))});
  }
  if(p==='/api/benefit-claims'){role(u,['member']);if(!u.approved)throw new ApiError(403,'Account awaiting approval');return json({items:await listBenefitClaims(db,u.id),eligibilityRequestEnabled:true,manualProcessing:true,automaticClaimProcessing:false,walletCreditAutomation:false,turnoverEnforcement:false,state:'manual_review'});}
  if(p==='/api/withdrawal-banks')return getWithdrawalBanks(await withdrawalSettings(c,u));
  if(p==='/api/withdrawals')return listMemberWithdrawals(await withdrawalSettings(c,u));
  if(p==='/api/game-wallet'){
   role(u,['member']);if(!u.approved)throw new ApiError(403,'Account awaiting approval');
   const search=new URL(req.url).searchParams,requested=bodyProfileId({profile:search.get('profile'),profileId:search.get('profileId')});if(requested.error)return requested.error;
   const profile=getGameProviderProfile(requested.profileId??'megah5_myr');if(!profile||!profile.listedInLobby)return invalidGameProfile('GAME_PROFILE_INVALID','profile_not_registered');
   if(transferProfileSupported(profile)){
    const acceptance=await getGameProviderAcceptanceReadiness(db),accepted=acceptance.profiles.find(item=>item.profileId===profile.profileId),runtime=gameTransferRuntime(c,profile.profileId,u.id,accepted?.evidenceAccepted===true),transfer=await readMemberTransferWallet(db,u.id,profile,runtime?.recoveryEnabled===true),legacy=await memberProfileGameWallet(db,u.id,profile);
    const production=runtime?.mode==='production',capabilities=accepted?.capabilities??{},launchReady=runtime?.launchAuthorized===true&&c.newGameLaunchesEnabled==='true',liveReady=production&&launchReady&&observedTransferAvailability(c,profile.profileId);
    return json(transfer.session||!legacy.session?{...transfer,qaOnly:runtime?.mode==='qa',launchReady,liveReady,launchVerified:production&&capabilities.launch===true,walletVerified:production&&capabilities.wallet===true,settlementVerified:production&&capabilities.settlement===true,capabilityReason:launchReady?runtime?.mode==='qa'?'restricted_qa':'profile_acceptance_ready':transfer.capabilityReason}:legacy);
   }
   if(profile.profileId!=='megah5_myr')return json(await memberProfileGameWallet(db,u.id,profile));
   return json({profileId:profile.profileId,supportsSettlement:true,supportsRecovery:true,...await memberMegaWalletState(await acceptedMegaWalletSettings(c,u))});
  }
  if(p==='/api/announcements')return json({items:await rows(db,"SELECT id,title,body,created_at,starts_at,ends_at FROM announcements WHERE status='published' AND (starts_at IS NULL OR starts_at<=?) AND (ends_at IS NULL OR ends_at>?) ORDER BY created_at DESC,id DESC LIMIT 100",now(),now())});
  if(p==='/api/ads')return json({items:await rows(db,"SELECT id,title,image_data,target_url,position,starts_at,ends_at FROM lobby_ads WHERE enabled=1 AND status='published' AND (starts_at IS NULL OR starts_at<=?) AND (ends_at IS NULL OR ends_at>?) ORDER BY position ASC,created_at DESC,id ASC LIMIT 20",now(),now())});
  if(p==='/api/marketing/campaign-image'){
   const campaignId=new URL(req.url).searchParams.get('campaign')??'';if(!/^[A-Za-z0-9_-]{1,128}$/.test(campaignId))throw new ApiError(400,'Campaign ID required');
   const entry=await db.prepare("SELECT image_data FROM marketing_campaigns WHERE id=? AND image_data<>''").bind(campaignId).first<{image_data:string}>(),match=entry?.image_data?.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
   if(!match||!validImageData(entry!.image_data))throw new ApiError(404,'Campaign image not found');const bytes=Uint8Array.from(atob(match[2]),char=>char.charCodeAt(0));
   return new Response(bytes,{headers:{'Content-Type':match[1],'Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
  }
  if(p==='/api/payment-channels'){const allItems=await rows(db,'SELECT provider_id,provider_name,status FROM payment_channel_controls ORDER BY CASE provider_id WHEN \'vpay\' THEN 1 WHEN \'gspay\' THEN 2 WHEN \'gspay_usdt\' THEN 3 WHEN \'1mpay\' THEN 4 ELSE 5 END'),flags=await paymentFlags(c,allItems),items=automaticPaymentChannels(allItems.filter((item:any)=>item.provider_id!=='gspay_plus'),flags);return json({items,...flags});}
  if(p==='/api/custom-games')return json({...automaticAvailability,playable:false,launchReady:false,walletReady:false,capabilityReason:'custom_game_engine_not_implemented',items:[]});
  if(p==='/api/benefits'){const saved=await rows(db,"SELECT id,title,description,rules_json,created_at,updated_at FROM benefit_rules WHERE status='active' ORDER BY updated_at DESC,id ASC LIMIT 100"),items=saved.map((x:any)=>({...x,rules:JSON.parse(x.rules_json)})).filter((x:any)=>x.rules.rewardType!=='vip');return json({items,calculation:'preview_only',eligibilityRequestEnabled:true,manualProcessing:true,automaticClaimProcessing:false,walletCreditAutomation:false,turnoverEnforcement:false,vipTierReady:false});}
  if(p==='/api/benefits/calculate'){const q=new URL(req.url).searchParams,id=q.get('id')??'',deposit=Number(q.get('deposit'));if(!id||!Number.isFinite(deposit)||deposit<0.01||deposit>1000000)throw new ApiError(400,'Invalid benefit or deposit amount');const item=await db.prepare("SELECT rules_json FROM benefit_rules WHERE id=? AND status='active'").bind(id).first<{rules_json:string}>();if(!item)throw new ApiError(404,'Benefit not found');const rules=JSON.parse(item.rules_json);if(rules.rewardType==='vip')throw new ApiError(409,'VIP member tiers are not configured');return json({...calculateBenefit(rules,deposit),calculation:'preview_only',claimable:false,walletCreditAutomation:false,turnoverEnforcement:false});}
  if(p==='/api/game-ranking')return json(await getPublicGameRanking(db));
  if(p==='/api/supplier-art-list')return json({items:await publicSupplierControls(db)});
  if(p==='/api/supplier-art'){
   const providerId=new URL(req.url).searchParams.get('provider')??'';if(!apiSupplierIds.includes(providerId))throw new ApiError(404,'Supplier artwork not found');
   const entry=await db.prepare('SELECT image_data FROM api_supplier_artwork WHERE provider_id=?').bind(providerId).first<{image_data:string}>(),match=entry?.image_data?.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
   if(!match||!validImageData(entry!.image_data))throw new ApiError(404,'Supplier artwork not found');
   const bytes=Uint8Array.from(atob(match[2]),char=>char.charCodeAt(0));return new Response(bytes,{headers:{'Content-Type':match[1],'Cache-Control':'public, max-age=60','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
  }
  if(p==='/api/brand-directory'){
   return json({items:[],categories:[],playable:false,retired:true});
  }
  if(p==='/api/brand-directory-art')throw new ApiError(404,'Legacy brand directory is retired');
  if(p==='/api/admin/game-sync'){role(u,['owner','staff']);const catalogue=await automaticCatalogue(c,await gatewayGames(c));return json({...automaticAvailability,providers:catalogue.providers,gameCount:catalogue.games.length,syncIntervalSeconds:300,playable:catalogue.playable});}
  if(p==='/api/admin/games'){role(u,['owner','staff']);return json(await automaticCatalogue(c,await gatewayGames(c)));}
  if(p==='/api/admin/game-acceptance'){role(u,['owner','staff']);const search=new URL(req.url).searchParams;return json(await getGameProviderAcceptance(db,u,{environment:search.get('environment')??'production',eventLimit:search.get('limit')??undefined}));}
  if(p==='/api/admin/jdb-wager-coverage'){role(u,['owner','staff']);const search=new URL(req.url).searchParams;return json(await getJdbWagerCoverage(db,u,{timeBasis:search.get('timeBasis')??undefined,from:search.get('from')??undefined,to:search.get('to')??undefined}));}
  if(p==='/api/games'){
   const search=new URL(req.url).searchParams,requestedProfileId=queryProfileId(search),requestedProfile=requestedProfileId?getGameProviderProfile(requestedProfileId):null;
   if(requestedProfileId&&(!requestedProfile||!requestedProfile.listedInLobby))throw new ApiError(400,'Invalid game profile');
   let selectedProvider=search.get('provider');if(selectedProvider!==null&&!apiSupplierIdSet.has(selectedProvider))throw new ApiError(400,'Invalid game provider');
   if(requestedProfile&&selectedProvider!==null&&requestedProfile.providerId!==selectedProvider)throw new ApiError(400,'Game profile does not belong to provider');
   if(requestedProfile)selectedProvider=requestedProfile.providerId;
   if(selectedProvider===null){const platformState=await publicSupplierPlatforms(c),{providers,rankingState,...profileState}=platformState,liveReady=providers.some(provider=>provider.platformLaunchReady);return json(await providerGameResponse(c,u,{...automaticAvailability,...profileState,mode:'provider-platforms',providers,games:[],providersOnly:true,platformsOnly:false,gamesOmittedUntilProviderSelected:true,gameCountScope:'current_response',selectedProvider:null,selectedProfile:null,selectedProfileId:null,selectedPlatform:null,platformCount:providers.length,totalGameCount:0,selectedGameCount:0,playable:liveReady,liveReady,launchProvider:liveReady?'megah5':null,launchProfile:liveReady?'megah5_myr':null,ranking:{...rankingState.ranking,configured:rankingState.configured,source:'owner_curated',automaticRanking:false,internalGamesRanked:false}}));}
   const trustedSource=configuredGameCatalogueSourceIds(c).includes(selectedProvider),capability=await megaProviderCapability(c),catalogue=trustedSource?await automaticCatalogue(c,await getGameCatalogue(c,{providerId:selectedProvider,profileId:requestedProfileId??undefined}),capability):{providers:[],games:[]},games=catalogue.games.filter((game:any)=>game.provider===selectedProvider),fresh=await publicSupplierPlatforms(c,capability),selected=(catalogue.providers??[]).find((provider:any)=>provider.id===selectedProvider),providers=fresh.providers.map((provider:any)=>provider.id===selectedProvider&&selected?{...provider,...selected,catalogueCacheStatus:String(selected.status??'missing'),catalogueCacheFresh:gameCatalogueCacheFresh(c,Number(selected.checkedAt)),cachedGameCount:Number(selected.count??0)}:provider),selectedPlatform=providers.find((provider:any)=>provider.id===selectedProvider)??null,liveReady=selectedPlatform?.platformLaunchReady===true;
   const providerProfiles=fresh.profiles.filter(profile=>profile.providerId===selectedProvider),selectedProfile=requestedProfileId?fresh.profiles.find(profile=>profile.profileId===requestedProfileId)??null:providerProfiles.length===1?providerProfiles[0]:null;
   return json(await providerGameResponse(c,u,{...automaticAvailability,profiles:fresh.profiles,profileCount:fresh.profileCount,profileBrandCount:fresh.profileBrandCount,implementedProfileCount:fresh.implementedProfileCount,launchReadyProfileCount:fresh.launchReadyProfileCount,verifiedProfileCount:fresh.verifiedProfileCount,mode:'provider-games',providers,games,providersOnly:false,platformsOnly:false,selectedProvider,selectedProfile,selectedProfileId:selectedProfile?.profileId??null,selectedPlatform,platformCount:providers.length,totalGameCount:games.length,selectedGameCount:games.length,playable:games.some((game:any)=>game.playable),liveReady,launchProvider:liveReady?'megah5':null,launchProfile:liveReady?'megah5_myr':null,ranking:{...fresh.rankingState.ranking,configured:fresh.rankingState.configured,source:'owner_curated',automaticRanking:false,internalGamesRanked:false}}));
  }
  if(p==='/api/providers'){const [items,platforms]=await Promise.all([rows(db,'SELECT * FROM providers ORDER BY name'),publicSupplierPlatforms(c)]),byId=new Map(platforms.providers.map(provider=>[provider.id,provider]));return json({...automaticAvailability,items:(items as any[]).filter(item=>apiSupplierIdSet.has(String(item.id))).map(item=>({...item,...byId.get(item.id)})),playable:platforms.providers.some(provider=>provider.platformLaunchReady)});}
  if(p==='/api/social-links'){
   const s=await social(db),contacts=s.enabled?s.contacts.filter(item=>item.enabled):[],pixels=s.pixels.filter(item=>item.enabled),compat=socialCompatibility({contacts,pixels});
   return json({enabled:s.enabled&&contacts.length>0,contacts,pixels,...compat});
  }
  if(p==='/api/tickets'){
   role(u);const staff=u.role!=='member',url=new URL(req.url),page=Math.max(1,Math.min(10000,Number(url.searchParams.get('page'))||1)),limit=Math.max(5,Math.min(50,Number(url.searchParams.get('limit'))||20)),offset=(page-1)*limit,where=staff?'':'WHERE t.user_id=?',scopeValues=staff?[]:[u.id];
   const [count,items]=await Promise.all([db.prepare(`SELECT COUNT(*) total FROM tickets t ${where}`).bind(...scopeValues).first<any>(),rows(db,`SELECT t.*,owner.username,tr.last_event_at read_event_at,tr.last_event_id read_event_id,COALESCE((SELECT r.created_at FROM replies r WHERE r.ticket_id=t.id ORDER BY r.created_at DESC,r.id DESC LIMIT 1),t.created_at) last_activity_at,COALESCE((SELECT r.id FROM replies r WHERE r.ticket_id=t.id ORDER BY r.created_at DESC,r.id DESC LIMIT 1),t.id) last_event_id,(SELECT r.created_at FROM replies r WHERE r.ticket_id=t.id AND r.user_id<>? ORDER BY r.created_at DESC,r.id DESC LIMIT 1) other_reply_at,(SELECT r.id FROM replies r WHERE r.ticket_id=t.id AND r.user_id<>? ORDER BY r.created_at DESC,r.id DESC LIMIT 1) other_reply_id,(SELECT COUNT(*) FROM replies r WHERE r.ticket_id=t.id) reply_count FROM tickets t JOIN users owner ON owner.id=t.user_id LEFT JOIN ticket_reads tr ON tr.ticket_id=t.id AND tr.user_id=? ${where} ORDER BY CASE WHEN t.status='open' THEN 0 ELSE 1 END,last_activity_at DESC,t.id DESC LIMIT ? OFFSET ?`,u.id,u.id,u.id,...scopeValues,limit,offset)]);
   const ids=(items as any[]).map(item=>String(item.id));let replies:any[]=[];if(ids.length){const placeholders=ids.map(()=>'?').join(',');replies=await rows(db,`SELECT id,ticket_id,user_id,message,created_at,username FROM (SELECT r.*,author.username,ROW_NUMBER() OVER(PARTITION BY r.ticket_id ORDER BY r.created_at DESC,r.id DESC) reply_rank FROM replies r JOIN users author ON author.id=r.user_id WHERE r.ticket_id IN (${placeholders})) ranked WHERE reply_rank<=200 ORDER BY ticket_id,created_at,id`,...ids);}
   const result=(items as any[]).map(item=>{let externalAt=item.user_id!==u.id?Number(item.created_at):-1,externalId=item.user_id!==u.id?String(item.id):'';if(item.other_reply_at!==null&&item.other_reply_at!==undefined&&(Number(item.other_reply_at)>externalAt||Number(item.other_reply_at)===externalAt&&String(item.other_reply_id)>externalId)){externalAt=Number(item.other_reply_at);externalId=String(item.other_reply_id);}return {...item,unread:externalAt>=0&&eventAfter(externalAt,externalId,item.read_event_at,item.read_event_id),replies:replies.filter(reply=>reply.ticket_id===item.id),repliesTruncated:Number(item.reply_count)>200};});const total=Number(count?.total??0),notifications=await ticketNotificationState(db,u);
   return json({items:result,page,limit,total,pages:Math.max(1,Math.ceil(total/limit)),hasMore:offset+result.length<total,...notifications});
  }
  if(p==='/api/tickets/notifications'){role(u);return json(await ticketNotificationState(db,u));}
  if(p.startsWith('/api/admin/')){
   role(u,['owner','staff']);
	   if(p==='/api/admin/operations-intelligence'){
	    role(u,['owner']);const generatedAt=now(),period=new URL(req.url).searchParams.get('period')??'day';let window:ReturnType<typeof operationsWindow>;
	    try{window=operationsWindow(period,generatedAt);}catch{throw new ApiError(400,'Invalid operations report period');}
	    const {readiness}=await canonicalOperationsReadiness(c);return json(await operationsIntelligenceReport(db,window,readiness,generatedAt));
	   }
	   if(p==='/api/admin/vip'){role(u,['owner']);return json(await getAdminVip(db,await referralSettings(db)));}
	   if(p==='/api/admin/rewards'){role(u,['owner']);return json(await getAdminRewardsHub(db));}
	   if(p==='/api/admin/engagement'){role(u,['owner']);return json(await getAdminEngagement(db));}
	   if(p==='/api/admin/responsible-play'){role(u,['owner']);return json(await responsiblePlayAdminStats(db));}
	   if(p==='/api/admin/game-ranking'){role(u,['owner']);return json(await getGameRanking(db));}
   if(p==='/api/admin/risk/bonus-hunter'){
    const query=new URL(req.url).searchParams,hoursRaw=query.get('hours'),limitRaw=query.get('limit'),severityRaw=query.get('severity');
    const report=await bonusRiskReport(db,{hours:hoursRaw===null?undefined:Number(hoursRaw),limit:limitRaw===null?undefined:Number(limitRaw),severity:severityRaw===null?undefined:severityRaw as BonusRiskSeverity});
    return json({...report,canConfigure:u.role==='owner'});
   }
   if(p==='/api/admin/summary'){const [summary,ticketState]=await Promise.all([db.prepare("SELECT (SELECT COUNT(*) FROM users) users,(SELECT COUNT(*) FROM users WHERE approved=0) pending,(SELECT COUNT(*) FROM tickets WHERE status='open') ticketsOpen,(SELECT COUNT(*) FROM providers WHERE visible=1) providersVisible").first(),ticketNotificationState(db,u)]);return json({...summary,ticketsUnread:ticketState.unread,ticketLatestEvent:ticketState.latestEvent,financialMetrics:'not-connected'});}
	   if(p==='/api/admin/financial-events'){
	    const owner=u.role==='owner',url=new URL(req.url),after=decodeFinancialEventCursor(url.searchParams.get('after'));
	    const source=owner?"SELECT 'deposit' event_type,id,created_at FROM deposit_orders WHERE provider<>'manual_bank' UNION ALL SELECT 'manual_bank' event_type,id,created_at FROM deposit_orders WHERE provider='manual_bank' UNION ALL SELECT 'withdrawal' event_type,id,created_at FROM withdrawal_requests":"SELECT 'manual_bank' event_type,id,created_at FROM deposit_orders WHERE provider='manual_bank'";
	    const summarySql=owner?"SELECT 'deposit' event_type,COUNT(CASE WHEN status IN ('pending','creating','created','unknown','review') THEN 1 END) pending,(SELECT id FROM deposit_orders x WHERE x.provider<>'manual_bank' ORDER BY x.created_at DESC,x.id DESC LIMIT 1) latest_id,(SELECT created_at FROM deposit_orders x WHERE x.provider<>'manual_bank' ORDER BY x.created_at DESC,x.id DESC LIMIT 1) latest_created_at FROM deposit_orders WHERE provider<>'manual_bank' UNION ALL SELECT 'manual_bank',COUNT(CASE WHEN status='pending' THEN 1 END),(SELECT id FROM deposit_orders x WHERE x.provider='manual_bank' ORDER BY x.created_at DESC,x.id DESC LIMIT 1),(SELECT created_at FROM deposit_orders x WHERE x.provider='manual_bank' ORDER BY x.created_at DESC,x.id DESC LIMIT 1) FROM deposit_orders WHERE provider='manual_bank' UNION ALL SELECT 'withdrawal',COUNT(CASE WHEN status IN ('pending','approved','processing') THEN 1 END),(SELECT id FROM withdrawal_requests x ORDER BY x.created_at DESC,x.id DESC LIMIT 1),(SELECT created_at FROM withdrawal_requests x ORDER BY x.created_at DESC,x.id DESC LIMIT 1) FROM withdrawal_requests":"SELECT 'manual_bank' event_type,COUNT(CASE WHEN status='pending' THEN 1 END) pending,(SELECT id FROM deposit_orders x WHERE x.provider='manual_bank' ORDER BY x.created_at DESC,x.id DESC LIMIT 1) latest_id,(SELECT created_at FROM deposit_orders x WHERE x.provider='manual_bank' ORDER BY x.created_at DESC,x.id DESC LIMIT 1) latest_created_at FROM deposit_orders WHERE provider='manual_bank'";
	    const eventSql=after?`SELECT event_type,id,created_at FROM (${source}) financial_events WHERE created_at>? OR (created_at=? AND event_type>?) OR (created_at=? AND event_type=? AND id>?) ORDER BY created_at,event_type,id LIMIT 50`:null;
	    const [summaryRows,eventRows]=await Promise.all([rows(db,summarySql),eventSql?rows(db,eventSql,after!.createdAt,after!.createdAt,after!.type,after!.createdAt,after!.type,after!.id):Promise.resolve([])]),summaryByType=new Map(summaryRows.map((item:any)=>[item.event_type,item])),pending={deposits:owner?Number((summaryByType.get('deposit') as any)?.pending??0):0,withdrawals:owner?Number((summaryByType.get('withdrawal') as any)?.pending??0):0,manualBank:Number((summaryByType.get('manual_bank') as any)?.pending??0)};const latestIds={deposit:owner?(summaryByType.get('deposit') as any)?.latest_id??null:null,withdrawal:owner?(summaryByType.get('withdrawal') as any)?.latest_id??null:null,manualBank:(summaryByType.get('manual_bank') as any)?.latest_id??null};
	    const events=(eventRows as any[]).map(item=>({cursor:encodeFinancialEventCursor({createdAt:Number(item.created_at),type:item.event_type,id:item.id}),type:item.event_type,id:item.id}));let cursor=after?encodeFinancialEventCursor(after):'';if(events.length)cursor=events[events.length-1].cursor;else if(!after){const latest=(summaryRows as any[]).filter(item=>item.latest_id!==null&&item.latest_id!==undefined).map(item=>({createdAt:Number(item.latest_created_at),type:item.event_type as FinancialEventType,id:String(item.latest_id)})).sort((a,b)=>a.createdAt-b.createdAt||a.type.localeCompare(b.type)||a.id.localeCompare(b.id)).at(-1);if(latest)cursor=encodeFinancialEventCursor(latest);}
	    return json({cursor,events,pending:{...pending,total:pending.deposits+pending.withdrawals+pending.manualBank},latestIds});
	   }
   if(p==='/api/admin/deposit-controls'){const controls=await depositControls(db);return json({items:depositControlProviders.map(providerId=>({providerId,mode:controls[providerId]}))});}
   if(p==='/api/admin/payment-channels'){const items=await rows(db,'SELECT provider_id,provider_name,status,updated_at FROM payment_channel_controls ORDER BY CASE provider_id WHEN \'vpay\' THEN 1 WHEN \'gspay\' THEN 2 WHEN \'gspay_usdt\' THEN 3 WHEN \'1mpay\' THEN 4 ELSE 5 END'),flags=await paymentFlags(c,items);return json({items:automaticPaymentChannels(items.filter((item:any)=>item.provider_id!=='gspay_plus'),flags),...flags});}
   if(p==='/api/admin/game-wallet'){const [mega,profiles,transfers]=await Promise.all([adminMegaWalletSessions(megaWalletSettings(c,u)),adminProfileGameWallets(db),adminTransferWalletRecords(db)]);return json({...mega,...profiles,profileItems:[...transfers,...profiles.profileItems]});}
   if(p==='/api/admin/production-acceptance'){const search=new URL(req.url).searchParams;return json(await getProductionAcceptance(db,u,{environment:search.get('environment')??'production',eventLimit:search.get('limit')??undefined}));}
   if(p==='/api/admin/brand-directory')return json({items:[],categories:[],retired:true,message:'Legacy brand directory is retired; use Supplier APIs and Game controls.'});
   if(p==='/api/admin/ads')return json({items:await rows(db,'SELECT id,title,image_data,target_url,enabled,status,starts_at,ends_at,position,created_at,updated_at FROM lobby_ads ORDER BY position ASC,created_at DESC,id ASC LIMIT 20'),maxAds:20,imageMaxBytes:350000,desktopSize:'1200x360',rotationSeconds:300,timezone:'Asia/Kuching'});
   if(p==='/api/admin/announcements')return json({items:await rows(db,'SELECT id,title,body,status,starts_at,ends_at,created_at,updated_at FROM announcements ORDER BY created_at DESC,id DESC LIMIT 100'),timezone:'Asia/Kuching'});
   if(p==='/api/admin/custom-games')return json({...automaticAvailability,items:(await rows(db,'SELECT id,title,provider_name,game_code,category,image_data,is_platform_mini,position,created_at,updated_at FROM custom_game_cards ORDER BY is_platform_mini DESC,provider_name ASC,position ASC,created_at ASC LIMIT 100')).map((item:any)=>({...item,...automaticAvailability,playable:false,launchReady:false,walletReady:false,launchVerified:false,walletVerified:false,capabilityReason:'custom_game_engine_not_implemented'})),maxCards:100,maxPlatformMiniGames:5,imageMaxBytes:350000,imageSize:'800x600'});
   if(p==='/api/admin/benefits'){const [items,claimRows]=await Promise.all([rows(db,"SELECT id,title,description,rules_json,status,created_at,updated_at FROM benefit_rules WHERE id<>'new-member-rm88-sponsored' ORDER BY updated_at DESC,id ASC LIMIT 100"),rows(db,"SELECT c.id,c.benefit_rule_id,c.rules_snapshot_json,c.reward_minor,c.turnover_required_minor,c.status,c.review_status,c.reviewed_by,c.reviewed_at,c.review_note,c.wallet_credit_status,c.turnover_source_status,c.created_at,u.username,reviewer.username reviewer_username,COALESCE(b.title,'Deleted benefit') benefit_title FROM benefit_claims c JOIN users u ON u.id=c.user_id LEFT JOIN users reviewer ON reviewer.id=c.reviewed_by LEFT JOIN benefit_rules b ON b.id=c.benefit_rule_id WHERE c.benefit_rule_id<>'new-member-rm88-sponsored' ORDER BY CASE c.review_status WHEN 'pending' THEN 0 ELSE 1 END,c.created_at DESC,c.id DESC LIMIT 100")]),claims=claimRows.map((claim:any)=>{let snapshot:any={};try{snapshot=JSON.parse(claim.rules_snapshot_json);}catch{}return {id:claim.id,benefitRuleId:claim.benefit_rule_id,benefitTitle:claim.benefit_title,username:claim.username,selectedProviderId:snapshot.selectedProviderId??snapshot.providerId??null,rewardMinor:String(claim.reward_minor),turnoverRequiredMinor:String(claim.turnover_required_minor),status:claim.status,reviewStatus:claim.review_status,reviewedBy:claim.reviewer_username??claim.reviewed_by??null,reviewedAt:claim.reviewed_at===null?null:Number(claim.reviewed_at),reviewNote:claim.review_note??'',walletCreditStatus:claim.wallet_credit_status,turnoverSourceStatus:claim.turnover_source_status,createdAt:Number(claim.created_at)};});return json({items:items.map((x:any)=>({...x,rules:JSON.parse(x.rules_json)})),claims,claimReviewReady:true,claimReviewMode:'eligibility_only',calculationAutomation:true,calculationMode:'preview_only',automaticClaimProcessing:false,manualVoucherProcessing:false,walletCreditAutomation:false,turnoverEnforcement:false,companyPayoutMode:'owner_configured',vipTierReady:false});}
   if(p==='/api/admin/social-links'){
    const current=await social(db);return json({...current,canEdit:u.role==='owner',supportedContactTypes:[...socialContactTypes],supportedPixelProviders:['meta','google'],revisions:await socialHistory(db)});
   }
   if(p==='/api/admin/referrals'){
    role(u,['owner']);const config=await referralSettings(db),items=await rows(db,"SELECT r.referrer_id,ref.username referrer_username,r.member_id,member.username member_username,member.approved,r.code,r.created_at,CAST(COALESCE(SUM(CASE WHEN d.status='credited' THEN d.amount_minor ELSE 0 END),0) AS TEXT) deposit_minor,COUNT(DISTINCT CASE WHEN d.status='credited' THEN d.id END) deposit_orders FROM referral_relationships r JOIN users ref ON ref.id=r.referrer_id JOIN users member ON member.id=r.member_id LEFT JOIN deposit_orders d ON d.user_id=r.member_id GROUP BY r.referrer_id,ref.username,r.member_id,member.username,member.approved,r.code,r.created_at ORDER BY r.created_at DESC LIMIT 1000"),preview=await commissionPreview(db,config);
    const canCalculate=config.configured&&config.enabled&&config.basis==='deposit',totalDepositMinor=items.reduce((sum:any,item:any)=>sum+BigInt(String(item.deposit_minor??0)),0n).toString();return json({settings:config,...config,ratePercent:config.rateBasisPoints/100,relationshipCount:items.length,totalDepositMinor,totalCommissionMinor:canCalculate?referralCommission(totalDepositMinor,config.rateBasisPoints):'0',walletCreditAutomation:false,commissionWithdrawable:false,settlementMode:'preview_only',preview,persistedPeriods:await listCommissionPeriods(db),items:items.map((item:any)=>({...item,commission_minor:canCalculate?referralCommission(item.deposit_minor,config.rateBasisPoints):'0'}))});
   }
   if(p==='/api/admin/commission-periods'){role(u,['owner']);const q=new URL(req.url).searchParams,periodId=q.get('periodId');return json({items:await listCommissionPeriods(db),entries:periodId?await listCommissionEntries(db,idField(periodId)):[],walletCreditAutomation:false,settlementMode:'preview_only'});}
   if(p==='/api/admin/support-settings'){role(u,['owner']);return json(await supportAutomationSettings(db,c));}
	   if(p==='/api/admin/telegram-bot'){role(u,['owner']);return json(telegramAdminStatus(telegramSettings(c)));}
   if(p==='/api/admin/system-readiness'){
     const expectedAccountingPeriod=previousMytDayStart(now()),[counts,support,recovery,accountingClose,freeZoneRow,vipState,gameAcceptance]=await Promise.all([
      db.prepare("SELECT (SELECT COUNT(*) FROM users) users,(SELECT COUNT(*) FROM audit) audit_events,(SELECT COUNT(*) FROM tickets) tickets,(SELECT COUNT(*) FROM settings) settings").first<any>(),
      supportAutomationSettings(db,c),
      productionRecoveryReadiness(db),
      db.prepare('SELECT period_start,period_end,closed_at,checksum FROM accounting_daily_snapshots WHERE period_start=?').bind(expectedAccountingPeriod).first<any>(),
	      db.prepare("SELECT COUNT(*) n FROM game_visibility WHERE access_zone='free'").first<{n:number}>(),
	      vipProgramStatus(db),
      getGameProviderAcceptanceReadiness(db,observedGameAvailability(c)?['megah5_myr']:[])
     ]);
     const accountingReady=Number(accountingClose?.period_start)===expectedAccountingPeriod&&Number(accountingClose?.period_end)===expectedAccountingPeriod+86400&&Number(accountingClose?.closed_at)>=expectedAccountingPeriod+86400&&typeof accountingClose?.checksum==='string'&&accountingClose.checksum.length===64;
     const gameLiveReady=gameAcceptance.liveGames,gameSettlementVerified=gameAcceptance.allGamesVerified,freeGameCount=Number(freeZoneRow?.n??0),whatsapp=whatsappCampaignStatus(whatsappCampaignSettings(c));
     return json({release:RELEASE,databaseReady:true,exportReady:true,rolesReady:true,backupReady:recovery.backupReady,restoreReady:recovery.restoreReady,otpConfigured:!!(c.anchorApiBaseUrl&&c.anchorUsername&&c.anchorPassword&&c.anchorSenderId&&c.otpHashSecret&&c.otpHashSecret.length>=32),counts:{...counts,free_game_overrides:freeGameCount},accounting:{expectedPeriodStart:expectedAccountingPeriod,lastClose:accountingClose??null},productionEntryVerification:{status:'not_verified',scope:'external_dns_tls_and_routing',officialOrigins:['https://www.master7.best','https://www.master7.site'],probeCommand:'pnpm run probe:entries',callbackDeliveryVerified:false,realPaymentVerified:false},items:[{id:'portal_www',label:'Customer primary domain · www.master7.best · external DNS/TLS verification required',status:'pending_verification'},{id:'backoffice_domain',label:'Owner and staff domain · www.master7.site · external DNS/TLS verification required',status:'pending_verification'},{id:'backoffice',label:'Staff application route · /admin · domain acceptance separate',status:'ready'},{id:'android_app',label:'MASTER7 Android APK · v17.0.52',status:'ready'},{id:'ios_app',label:'MASTER7 iPhone Safari Web App entry',status:'ready'},{id:'roles',label:'Admin / staff / member roles',status:'ready'},{id:'otp',label:'Malaysia registration SMS OTP',status:!!(c.anchorApiBaseUrl&&c.anchorUsername&&c.anchorPassword&&c.anchorSenderId&&c.otpHashSecret&&c.otpHashSecret.length>=32)?'ready':'pending_verification'},{id:'languages',label:'Chinese / English / Bahasa Melayu',status:'ready'},{id:'supplier_controls',label:'Supplier API capability, logos and records',status:'ready'},{id:'free_paid_zones',label:`Free / paid game zone controls and display ready · ${freeGameCount} free game(s) selected`,status:'ready'},{id:'orders',label:'Wallet ledger, company-bank deposit and withdrawal review workflows',status:'ready'},{id:'reports',label:'MYT settled-cashflow close snapshot (daily / month / half-year / year)',status:accountingReady?'ready':'pending_verification'},{id:'benefit_claims',label:'Admin-configured benefits and manual eligibility review ready · automatic wallet credit disabled',status:'ready'},{id:'turnover',label:'Benefit turnover preview available · automated wager source and withdrawal enforcement not connected',status:'pending_verification'},{id:'vip_engine',label:'Eight-tier VIP engine, editor and member display',status:'ready'},{id:'vip',label:vipState.configured?`Dedicated VIP business rules · ${vipState.activeTiers} tier(s) configured`:'Dedicated VIP business rules not configured · admin rates required',status:vipState.enabled?'ready':'pending_verification'},{id:'referral',label:'Admin referral ownership and deposit-basis commission preview',status:'ready'},{id:'commission_wallet',label:'Commission settlement, claiming and wallet credit',status:'pending_verification'},{id:'support',label:'Customer tickets and staff replies',status:'ready'},{id:'export',label:'Portal CSV export',status:'ready'},{id:'security',label:'Role protection and audit trail',status:'ready'},{id:'backup_engine',label:'RSA + AES-256-GCM independent backup generator',status:'ready'},{id:'encrypted_backup',label:'Latest encrypted independent backup evidence',status:recovery.backupReady?'ready':'pending_verification'},{id:'restore_engine',label:'Isolated recovery-rehearsal validator',status:'ready'},{id:'restore_rehearsal',label:'Latest isolated recovery rehearsal evidence',status:recovery.restoreReady?'ready':'pending_verification'},{id:'payment_connectors',label:'VPay / GSPAY+ / 1MPAY deposit connector controls',status:'ready'},{id:'payments',label:'VPay / GSPAY+ / 1MPAY real-payment settlement acceptance',status:'maintenance'},{id:'game_controls',label:'38-provider lobby and automatic API capability',status:'ready'},{id:'game_capability',label:'Provider game launch and wallet API capability',status:gameLiveReady?'ready':'maintenance'},{id:'games',label:'Provider game launch and wallet settlement acceptance',status:gameLiveReady&&gameSettlementVerified?'ready':'pending_verification'},{id:'whatsapp_module',label:'WhatsApp Business consent, queue, callback and opt-out controls',status:'ready'},{id:'whatsapp_marketing',label:'Meta-approved marketing template and sender · +601166336686',status:whatsapp.ready?'ready':'pending_verification'},{id:'ai_support',label:'Built-in customer reply assistant',status:support.providerReady?'ready':'pending_verification'}]});
   }
	   if(p==='/api/admin/marketing'){
	    role(u,['owner']);const url=new URL(req.url),format=url.searchParams.get('format'),campaignId=url.searchParams.get('campaign')??'';
	    if(format==='csv'){
	     const campaign=campaignId?await db.prepare('SELECT id,name,message,image_data,benefit_text,referral_code FROM marketing_campaigns WHERE id=?').bind(campaignId).first<any>():null;if(!campaign)throw new ApiError(404,'Campaign not found');
	     await auditStmt(db,u,'marketing_contacts_exported',campaign.id).run();return marketingCsvResponse(db,campaign);
	    }
	    if(url.searchParams.get('contacts')==='1'){
	     const page=Math.max(1,Math.min(12000,Number(url.searchParams.get('page'))||1)),limit=Math.max(1,Math.min(100,Number(url.searchParams.get('limit'))||50)),offset=(page-1)*limit,q=(url.searchParams.get('q')??'').trim().slice(0,100),consent=url.searchParams.get('consent')??'';
	     if(consent&&!['opted_in','unknown','opted_out'].includes(consent))throw new ApiError(400,'Invalid consent filter');const where:string[]=[];const values:(string|number)[]=[];
	     if(q){where.push('(phone LIKE ? OR name LIKE ?)');values.push(`%${q}%`,`%${q}%`);}if(consent){where.push('consent_status=?');values.push(consent);}const clause=where.length?' WHERE '+where.join(' AND '):'';
	     const [count,items]=await Promise.all([db.prepare(`SELECT COUNT(*) total FROM marketing_contacts${clause}`).bind(...values).first<any>(),rows(db,`SELECT id,phone,name,consent_status,source,consented_at,consent_source,consent_proof,created_at,updated_at FROM marketing_contacts${clause} ORDER BY updated_at DESC,id DESC LIMIT ? OFFSET ?`,...values,limit,offset)]);
	     const total=Number(count?.total??0);return json({items,page,limit,total,pages:Math.max(1,Math.ceil(total/limit))});
	    }
	    const whatsapp=whatsappCampaignStatus(whatsappCampaignSettings(c)),[counts,campaigns,codes]=await Promise.all([
	     db.prepare("SELECT COUNT(*) total,SUM(CASE WHEN consent_status='opted_in' THEN 1 ELSE 0 END) opted_in,SUM(CASE WHEN consent_status='unknown' THEN 1 ELSE 0 END) unknown_count,SUM(CASE WHEN consent_status='opted_out' THEN 1 ELSE 0 END) opted_out FROM marketing_contacts").first<any>(),
	     rows(db,"SELECT c.id,c.name,c.channel,c.message,c.benefit_text,c.referral_code,c.retention_goal,c.send_rate_per_minute,c.scheduled_at,c.status,c.provider,c.template_name,c.template_language,c.audience_count,c.started_at,c.completed_at,c.updated_at,CASE WHEN c.image_data<>'' THEN 1 ELSE 0 END image_available,SUM(CASE WHEN d.status='queued' THEN 1 ELSE 0 END) queued_count,SUM(CASE WHEN d.status='submitting' THEN 1 ELSE 0 END) submitting_count,SUM(CASE WHEN d.status='unknown' THEN 1 ELSE 0 END) unknown_count,SUM(CASE WHEN d.status='sent' THEN 1 ELSE 0 END) sent_count,SUM(CASE WHEN d.status='delivered' THEN 1 ELSE 0 END) delivered_count,SUM(CASE WHEN d.status='read' THEN 1 ELSE 0 END) read_count,SUM(CASE WHEN d.status='failed' THEN 1 ELSE 0 END) failed_count,SUM(CASE WHEN d.status='opted_out' THEN 1 ELSE 0 END) opted_out_count FROM marketing_campaigns c LEFT JOIN marketing_deliveries d ON d.campaign_id=c.id GROUP BY c.id,c.name,c.channel,c.message,c.image_data,c.benefit_text,c.referral_code,c.retention_goal,c.send_rate_per_minute,c.scheduled_at,c.status,c.provider,c.template_name,c.template_language,c.audience_count,c.started_at,c.completed_at,c.updated_at ORDER BY c.updated_at DESC LIMIT 50"),
	     rows(db,'SELECT r.code,u.username FROM referral_codes r JOIN users u ON u.id=r.user_id ORDER BY u.created_at DESC LIMIT 5000')
	    ]);
	    return json({providerReady:whatsapp.ready,launchEnabled:whatsapp.ready,providerStatus:whatsapp.ready?'Ready · approved Meta template only':'Waiting · official Meta configuration, template or verified recipient tier is incomplete',freeTools:true,maximumContacts:MARKETING_CONTACT_LIMIT,whatsapp,counts:{total:Number(counts?.total??0),optedIn:Number(counts?.opted_in??0),unknown:Number(counts?.unknown_count??0),optedOut:Number(counts?.opted_out??0)},campaigns:(campaigns as any[]).map(item=>({...item,image_available:!!Number(item.image_available),queued_count:Number(item.queued_count??0),submitting_count:Number(item.submitting_count??0),unknown_count:Number(item.unknown_count??0),sent_count:Number(item.sent_count??0),delivered_count:Number(item.delivered_count??0),read_count:Number(item.read_count??0),failed_count:Number(item.failed_count??0),opted_out_count:Number(item.opted_out_count??0)})),codes});
	   }
   if(p==='/api/admin/finance-center'){
    const url=new URL(req.url),range=accountingPeriod(url.searchParams);
    return json(await financeCenterReport(db,range,{generatedAt:now(),settlementVerified:false}));
   }
   if(p==='/api/admin/accounting'){
    role(u,['owner']);
    const url=new URL(req.url),range=accountingPeriod(url.searchParams),closed=range.period==='yesterday'?await accountingSnapshot(db,range.start):null,result=closed??{...await settledCashflow(db,range.start,range.end,range.label,range.period),snapshot:{closed:false},generatedAt:now()},depositMinor=result.deposits.amountMinor,withdrawMinor=result.withdrawals.amountMinor,netMinor=result.netCashflowMinor;
    if(url.searchParams.get('format')==='csv'){const lines=['Report type,Scope,Period,Start,End,Deposit orders,Deposit members,Deposit MYR,Withdrawal orders,Withdrawal members,Withdrawal MYR,Net settled cashflow MYR',[ACCOUNTING_REPORT_TYPE,'Settled deposits minus paid withdrawals',range.label,range.start,range.end,result.deposits.orders,result.deposits.members,(Number(depositMinor)/100).toFixed(2),result.withdrawals.orders,result.withdrawals.members,(Number(withdrawMinor)/100).toFixed(2),(Number(netMinor)/100).toFixed(2)].join(',')];return new Response(lines.join('\n'),{headers:{...responseHeaders,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="master7-accounts-${range.label.replace(/[^0-9A-Za-z-]/g,'-')}.csv"`}});}
    return json(result);
   }
   if(p==='/api/admin/operations'){
    const day=Math.floor((now()+28800)/86400)*86400-28800;
    const [n,d,w]=await Promise.all([
     db.prepare('SELECT COUNT(*) n FROM users WHERE created_at>=?').bind(day).first<{n:number}>(),
     db.prepare("SELECT COUNT(*) orders,COUNT(DISTINCT user_id) members,CAST(COALESCE(SUM(amount_minor),0) AS TEXT) amount FROM deposit_orders WHERE status='credited' AND updated_at>=?").bind(day).first<{orders:number;members:number;amount:string}>(),
     db.prepare("SELECT COUNT(*) requests,COUNT(DISTINCT user_id) members,CAST(COALESCE(SUM(amount_minor),0) AS TEXT) amount FROM withdrawal_requests WHERE created_at>=?").bind(day).first<{requests:number;members:number;amount:string}>()
    ]);
    return json({readOnly:true,metrics:{newMembersPreview:n?.n??0,depositMembersToday:d?.members??0,depositOrdersToday:d?.orders??0,depositMYR:Number(d?.amount??0)/100,withdrawMembersToday:w?.members??0,withdrawRequestsToday:w?.requests??0,withdrawMYR:Number(w?.amount??0)/100,bonusMYR:null,netRevenueMYR:null,groupJoins:null}});
   }
   if(p==='/api/admin/withdrawals')return listAdminWithdrawals(await withdrawalSettings(c,u));
   role(u,['owner']);
   if(p==='/api/admin/users')return json({items:await rows(db,'SELECT id,username,role,approved,created_at FROM users ORDER BY created_at DESC LIMIT 500')});
   if(p==='/api/admin/payment-diagnostics')return json({items:(await rows(db,"SELECT target,created_at FROM audit WHERE event='payment_order_diagnostic' ORDER BY created_at DESC,id DESC LIMIT 100")).map((x:any)=>{try{return {...JSON.parse(x.target),createdAt:x.created_at};}catch{return {kind:'UNAVAILABLE',createdAt:x.created_at};}})});
   if(p==='/api/admin/audit')return json({items:await rows(db,'SELECT a.event,a.target,a.created_at,u.username FROM audit a LEFT JOIN users u ON a.user_id=u.id ORDER BY a.created_at DESC,a.id DESC LIMIT 100')});
   if(p==='/api/admin/security'){const n=await db.prepare("SELECT COUNT(*) n FROM audit WHERE event='write_rate_limited' AND created_at>=?").bind(Math.floor((now()+28800)/86400)*86400-28800).first<{n:number}>();return json({today:{login_denied:null,login_rate_limited:null,registration_rate_limited:null,write_rate_limited:n?.n??0}});}
  if(p==='/api/admin/export'){const data:Record<string,unknown>={release:RELEASE,exportedAt:new Date().toISOString(),scope:'new-portal-only'};for(const table of ['users','tickets','replies','announcements','providers','brand_directory_entries','api_supplier_artwork','portal_status_snapshots','lobby_ads','custom_game_cards','benefit_rules','game_visibility','payment_channel_controls','provider_payout_controls','provider_payouts','withdrawal_requests','company_bank_accounts','manual_deposit_requests','manual_bank_transactions','game_wallet_sessions','game_wallet_ledger','provider_wallet_operations','game_provider_acceptance_events','game_provider_acceptance_current','production_acceptance_events','production_acceptance_current','rewards_checkins','rewards_points_ledger','settings','audit']){const list=await rows(db,`SELECT ${table==='users'?'id,username,role,approved,created_at':table==='api_supplier_artwork'?'provider_id,updated_by,updated_at':table==='lobby_ads'?'id,title,target_url,enabled,position,created_by,created_at,updated_at':table==='custom_game_cards'?'id,title,provider_name,game_code,category,is_platform_mini,enabled,status,position,created_by,created_at,updated_at':table==='game_visibility'?'provider_id,game_code,visible,status,category_override,access_zone,updated_by,updated_at':table==='withdrawal_requests'?'id,user_id,provider_id,provider_name,bank_code,bank_name,account_last4,amount_minor,currency,status,owner_note,updated_by,created_at,updated_at':table==='manual_deposit_requests'?'deposit_order_id,bank_account_id,reviewed_by,created_at,updated_at':table==='manual_bank_transactions'?'id,bank_account_id,bank_reference,direction,amount_minor,currency,deposit_order_id,payout_id,proof_sha256,bank_occurred_at,recorded_by,recorded_at':table==='provider_wallet_operations'?'session_id,profile_id,user_id,deposit_state,deposit_attempts,deposit_provider_reference,withdrawal_state,withdrawal_attempts,withdrawal_provider_reference,launch_state,closure_state,closure_evidence,zero_balance_verified,last_error_code,created_at,updated_at':table==='game_wallet_sessions'?'id,user_id,provider,profile_id,player_id,game_code,status,amount_out_minor,amount_returned_minor,expected_return_minor,deposit_reference,withdraw_reference,provider_residual,last_error,created_at,updated_at,settled_at':'*'} FROM ${table}${table==='settings'?" WHERE id NOT LIKE 'owner_password_%' AND id NOT LIKE 'staff_password_setup:%' AND id NOT LIKE 'staff_password_ready:%'":''} LIMIT 10001`);if(list.length>10000)throw new ApiError(413,'导出超过单次上限，请联系站点维护人员');data[table]=list;}return new Response(JSON.stringify(data,null,2),{headers:{...responseHeaders,'Content-Disposition':'attachment; filename="master7-portal-export.json"'}});}
  }
  throw new ApiError(404,'Not found');
 }
 // Cookies alone never authorize writes. Require exact Origin and a per-user token.
 if(!requestOriginAllowed(req,c.allowedOrigins))throw new ApiError(403,'Origin denied');
 role(u);if(!u.approved)throw new ApiError(403,'账号待管理员审批 / Account awaiting administrator approval');
 if(req.headers.get('x-csrf-token')!==u.csrf)throw new ApiError(403,'CSRF denied');
 // This retired write route must not even update the generic write-rate counter.
 if(p==='/api/admin/payment-channels'){
  role(u,['owner']);
  return json({error:'PAYMENT_AVAILABILITY_AUTOMATIC',message:'Payment availability is determined automatically; manual channel controls are no longer supported.',availabilityMode:'automatic',readOnly:true,deprecated:true},405);
 }
 const d=await body(req,['/api/manual-bank/deposits','/api/admin/manual-bank/account','/api/admin/manual-bank/review','/api/admin/manual-bank/payout/confirm'].includes(p)||p==='/api/admin/ads'||p==='/api/admin/custom-games'||p==='/api/admin/game-visibility'||p==='/api/admin/provider'||p==='/api/admin/brand-directory'||p==='/api/admin/supplier-art'||p==='/api/admin/marketing'?550000:24000);
 // Retired availability writes are rejected before the rate-limit journal.
 // Artwork/category/free-paid edits keep their existing owner authorization.
 const manualGameAvailability=(p==='/api/admin/supplier-art'&&d.status!==undefined)||(p==='/api/admin/game-visibility'&&(d.status!==undefined||d.visible!==undefined))||(p==='/api/admin/provider'&&d.visible!==undefined)||(p==='/api/admin/custom-games'&&(d.action==='toggle'||d.action==='status'));
 if(manualGameAvailability){role(u,['owner']);return json({...automaticAvailability,status:'deprecated',error:'Game availability follows the provider connection and implemented launch/wallet capability; manual availability controls are retired.'},410);}
 await limited(db,u,p==='/api/admin/marketing'?180:30);
 if(p==='/api/admin/deposit-controls'){
  role(u,['owner']);const providerId=d.providerId,mode=d.mode;
  if(typeof providerId!=='string'||!depositControlProviders.includes(providerId as DepositControlProvider)||(mode!=='auto'&&mode!=='paused'))throw new ApiError(400,'Invalid deposit control');
  await db.batch([db.prepare('INSERT INTO settings(id,value) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').bind('deposit_control:'+providerId,mode),auditStmt(db,u,'deposit_control_changed',providerId+':'+mode)]);
  return json({providerId,mode});
 }
 if(p==='/api/compliance'){role(u,['member']);if(Object.keys(d).length)throw new ApiError(400,'No personal documents or data accepted');return json({...await requestManualCompliance(db,u.id),enforcementEnabled:c.manualComplianceEnforced==='true'});}
 if(p==='/api/admin/compliance'){role(u,['owner']);return json(await reviewManualCompliance(db,u.id,d));}
 if(p==='/api/responsible-play'){role(u,['member']);return json(await updateResponsiblePlay(db,u.id,d));}
 if(p==='/api/payments/vpay/orders')return createResponsiblePlayGuardedDeposit(db,u,'vpay',d,()=>createVPayOrder(d,vpayContext),c.manualComplianceEnforced,c.newDepositsEnabled);
 if(p==='/api/payments/vpay/orders/query')return refreshVPayOrder(d,vpayContext);
 if(p==='/api/payments/gspay/orders')return createResponsiblePlayGuardedDeposit(db,u,'gspay',d,()=>createGSPayOrder(d,gspayContext),c.manualComplianceEnforced,c.newDepositsEnabled);
 if(p==='/api/payments/gspay/orders/query')return refreshGSPayOrder(d,gspayContext);
 if(p==='/api/payments/gspay/usdt/orders'||p==='/api/payments/gspay/usdt/orders/query'){role(u,['member']);return json({error:'GSPAY_USDT_NOT_READY',code:'PROVIDER_CONTRACT_UNVERIFIED',profileId:'gspay_usdt',currency:'USDT'},503);}
 if(p==='/api/payments/1mpay/orders')return createResponsiblePlayGuardedDeposit(db,u,'1mpay',d,()=>createOneMpayOrder(d,oneMpayContext),c.manualComplianceEnforced,c.newDepositsEnabled);
 if(p==='/api/payments/1mpay/orders/query')return refreshOneMpayOrder(d,oneMpayContext);
 if(p==='/api/game-launch'){role(u,['member']);if(c.newGameLaunchesEnabled!=='true')return json({error:'New game launches are temporarily unavailable',code:'GAMES_MAINTENANCE'},503);if(c.manualComplianceEnforced==='true')await authorizeManualComplianceAction(db,u.id,'game_launch');await assertResponsiblePlayGameLaunch(db,u.id);const resolution=resolveLaunchProfile(d);if(resolution.error)return resolution.error;return launchProviderGame(req,c,u,d,resolution.profile!);}
 if(p==='/api/rewards/check-in'){role(u,['member']);return json(await checkInRewardsHub(db,u.id));}
 if(p==='/api/game-wallet/settle'){
  role(u,['member']);const resolution=resolveWalletProfile(d);if(resolution.error)return resolution.error;
  const expectedSessionId=d.sessionId===undefined||d.sessionId===''?undefined:idField(d.sessionId);
  if(transferProfileSupported(resolution.profile!)){if(!expectedSessionId)throw new ProviderTransferError(400,'GAME_SESSION_INVALID');return json({profileId:resolution.profile!.profileId,...await settleTransferWallet(await transferSettings(c,u,resolution.profile!),expectedSessionId)});}
  return json({profileId:resolution.profile!.profileId,...await settleMegaWallet(megaWalletSettings(c,u),expectedSessionId)});
 }
 if(p==='/api/game-wallet/recover'){
  role(u,['member']);const resolution=resolveWalletProfile(d);if(resolution.error)return resolution.error;
  const expectedSessionId=d.sessionId===undefined||d.sessionId===''?undefined:idField(d.sessionId);
  if(transferProfileSupported(resolution.profile!)){if(!expectedSessionId)throw new ProviderTransferError(400,'GAME_SESSION_INVALID');return json({profileId:resolution.profile!.profileId,...await recoverTransferWallet(await transferSettings(c,u,resolution.profile!),expectedSessionId)});}
  return json({profileId:resolution.profile!.profileId,...await recoverMegaWallet(megaWalletSettings(c,u),expectedSessionId)});
 }
 if(p==='/api/manual-bank/deposits')return createResponsiblePlayGuardedDeposit(db,u,'manual_bank',d,async()=>{const response=await manualBankPost(p,d,{db,user:u,newDepositsEnabled:c.newDepositsEnabled,newPayoutsEnabled:c.newPayoutsEnabled});if(!response)throw new ApiError(404,'Not found');return response;},c.manualComplianceEnforced,c.newDepositsEnabled);
 const manualPayout=await manualBankPayoutPost(p,d,{db,user:u,dataKey:c.withdrawalDataKey,newPayoutsEnabled:c.newPayoutsEnabled,newDepositsEnabled:c.newDepositsEnabled});if(manualPayout)return manualPayout;
 const manual=await manualBankPost(p,d,{db,user:u,newDepositsEnabled:c.newDepositsEnabled,newPayoutsEnabled:c.newPayoutsEnabled});if(manual)return manual;
 if(p==='/api/withdrawals'){role(u,['member']);if(c.manualComplianceEnforced==='true')await authorizeManualComplianceAction(db,u.id,'withdrawal');return submitWithdrawal(d,await withdrawalSettings(c,u));}
 if(p==='/api/benefit-claims'){
  role(u,['member']);const requestKey=typeof d.requestKey==='string'&&/^[A-Za-z0-9_-]{16,80}$/.test(d.requestKey)?d.requestKey:'',benefitId=idField(d.benefitId);if(!requestKey)throw new ApiError(400,'Invalid claim request key');
  const replay=await getBenefitClaimByRequest(db,u.id,requestKey);if(replay)return json({status:'awaiting_acceptance',claim:replay,walletCredited:false,turnoverEnforced:false,manualProcessing:true,automaticClaimProcessing:false,idempotent:true});
  const benefit=await db.prepare("SELECT rules_json FROM benefit_rules WHERE id=? AND status='active'").bind(benefitId).first<{rules_json:string}>();if(!benefit)throw new ApiError(404,'Benefit not found');let rules:any;try{rules=JSON.parse(benefit.rules_json);}catch{throw new ApiError(409,'Benefit rules are invalid');}assertBenefitPublishable(rules);const selectedProviderId=typeof d.selectedProviderId==='string'?d.selectedProviderId:'',sponsoredProviderIds=Array.isArray(rules.sponsoredProviderIds)?rules.sponsoredProviderIds.filter((id:unknown)=>typeof id==='string'&&apiSupplierIdSet.has(id)):[];if(sponsoredProviderIds.length&&(!apiSupplierIdSet.has(selectedProviderId)||!sponsoredProviderIds.includes(selectedProviderId)))throw new ApiError(400,'Choose an eligible sponsored provider');if(!sponsoredProviderIds.length&&selectedProviderId&&rules.providerId!=='all'&&selectedProviderId!==rules.providerId)throw new ApiError(400,'Selected provider does not match this benefit');if(rules.newMemberOnly===true){const campaignStartsAt=Number(rules.campaignStartsAt);if(!Number.isSafeInteger(campaignStartsAt)||campaignStartsAt<0||u.created_at<campaignStartsAt)throw new ApiError(409,'This Voucher is only for members registered after the campaign started');}
  await db.prepare("UPDATE benefit_claims SET status='expired',updated_at=? WHERE user_id=? AND benefit_rule_id=? AND status='awaiting_acceptance' AND review_status='pending' AND expires_at<=?").bind(now(),u.id,benefitId,now()).run();
  const used=await db.prepare(rules.lifetimeClaimLimit===true?"SELECT COUNT(*) count FROM benefit_claims WHERE user_id=? AND benefit_rule_id=?":"SELECT COUNT(*) count FROM benefit_claims WHERE user_id=? AND benefit_rule_id=? AND status='awaiting_acceptance'").bind(u.id,benefitId).first<{count:number}>(),limit=Number(rules.claimLimitPerMember);if(!Number.isInteger(limit)||limit<1||Number(used?.count??0)>=limit)throw new ApiError(409,'Benefit claim limit reached');
  const depositOrderId=d.depositOrderId===undefined||d.depositOrderId===null||d.depositOrderId===''?null:idField(d.depositOrderId);let depositMinor='0';
  if(depositOrderId){const order=await db.prepare("SELECT amount_minor FROM deposit_orders WHERE id=? AND user_id=? AND status='credited'").bind(depositOrderId,u.id).first<{amount_minor:string|number}>();if(!order)throw new ApiError(409,'A credited deposit belonging to this member is required');depositMinor=String(order.amount_minor);}
  else if(Number(rules.minDepositMYR??0)>0)throw new ApiError(409,'Select a credited deposit for this benefit');
  const calculation=calculateBenefit(rules,Number(depositMinor)/100);if(!calculation.eligible||calculation.rewardMYR<=0)throw new ApiError(409,'Deposit does not qualify for this benefit');
  const rulesSnapshot=selectedProviderId?{...rules,selectedProviderId}:rules,result=await createBlockedBenefitClaim(db,{userId:u.id,benefitRuleId:benefitId,requestKey,depositOrderId,rules:rulesSnapshot,depositMinor,rewardMinor:String(Math.round(calculation.rewardMYR*100)),turnoverRequiredMinor:String(Math.round(calculation.turnoverMYR*100)),expiresAt:now()+Number(rules.validityDays)*86400});if(result.created)await auditStmt(db,u,'benefit_claim_recorded',`${result.claim.id}:${selectedProviderId||rules.providerId||'all'}`).run();
  return json({status:'awaiting_acceptance',claim:result.claim,walletCredited:false,turnoverEnforced:false,manualProcessing:true,automaticClaimProcessing:false,idempotent:!result.created},result.created?202:200);
 }

  if(p==='/api/tickets'){role(u,['member']);const subject=textField(d.subject,3,120),message=textField(d.message,5,2000),id=eventId(),createdAt=now(),automation=await supportAutomationSettings(db,c),statements:any[]=[db.prepare('INSERT INTO tickets(id,user_id,subject,message,created_at) VALUES(?,?,?,?,?)').bind(id,u.id,subject,message,createdAt),auditStmt(db,u,'ticket_created',id)];let assistantReply:Awaited<ReturnType<typeof generateSupportReply>>|null=null;if(automation.effectiveAiReply){assistantReply=await generateSupportReply(supportAiSettings(c),subject,message);const assistantId='system-support-assistant';statements.push(db.prepare("INSERT INTO users(id,username,role,approved,csrf,created_at) VALUES(?,?,'staff',1,'system-managed',0) ON CONFLICT(id) DO UPDATE SET username=excluded.username,role='staff',approved=1").bind(assistantId,SUPPORT_ASSISTANT_NAME),db.prepare('INSERT INTO replies(id,ticket_id,user_id,message,created_at) VALUES(?,?,?,?,?)').bind(eventId(),id,assistantId,assistantReply.message,createdAt+1),auditStmt(db,u,'support_assistant_replied',`${id}:${assistantReply.engine}`));}await db.batch(statements);return json({status:'ok',id,automatedReply:automation.effectiveAiReply,assistantName:SUPPORT_ASSISTANT_NAME,assistantEngine:assistantReply?.engine??null,humanHandoff:automation.humanHandoff||assistantReply?.requiresHumanHandoff===true},201);}
 if(p==='/api/tickets/read'){
  if(!Array.isArray(d.ticketIds)||d.ticketIds.length<1||d.ticketIds.length>50)throw new ApiError(400,'Choose 1 to 50 tickets');const ids=[...new Set(d.ticketIds.map((value:unknown)=>idField(value)))],statements:any[]=[],stamp=now();
  for(const id of ids){const ticket=await db.prepare('SELECT user_id,created_at FROM tickets WHERE id=?').bind(id).first<{user_id:string;created_at:number}>();if(!ticket||u.role==='member'&&ticket.user_id!==u.id)throw new ApiError(404,'Ticket not found');const reply=await db.prepare('SELECT id,created_at FROM replies WHERE ticket_id=? AND user_id<>? ORDER BY created_at DESC,id DESC LIMIT 1').bind(id,u.id).first<{id:string;created_at:number}>();let eventAt=reply?Number(reply.created_at):-1,eventId=reply?String(reply.id):'';if(ticket.user_id!==u.id&&(Number(ticket.created_at)>eventAt||Number(ticket.created_at)===eventAt&&String(id)>eventId)){eventAt=Number(ticket.created_at);eventId=String(id);}if(eventAt>=0)statements.push(db.prepare('INSERT INTO ticket_reads(ticket_id,user_id,last_event_at,last_event_id,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(ticket_id,user_id) DO UPDATE SET last_event_at=excluded.last_event_at,last_event_id=excluded.last_event_id,updated_at=excluded.updated_at').bind(id,u.id,eventAt,eventId,stamp));}
  if(statements.length)await db.batch(statements);return json({status:'ok',read:statements.length});
 }
 if(p==='/api/tickets/reply'){const id=idField(d.ticketId),message=textField(d.message,1,2000),ticket=await db.prepare('SELECT user_id,status,created_at,(SELECT MAX(created_at) FROM replies WHERE ticket_id=tickets.id) last_reply_at FROM tickets WHERE id=?').bind(id).first<{user_id:string;status:string;created_at:number;last_reply_at:number|null}>();if(!ticket||u.role==='member'&&ticket.user_id!==u.id)throw new ApiError(404,'Ticket not found');if(ticket.status!=='open')throw new ApiError(409,'工单已关闭 / Ticket closed');const createdAt=Math.max(now(),Number(ticket.last_reply_at??ticket.created_at)+1);await db.batch([db.prepare('INSERT INTO replies(id,ticket_id,user_id,message,created_at) VALUES(?,?,?,?,?)').bind(eventId(),id,u.id,message,createdAt),auditStmt(db,u,'ticket_replied',id)]);return json({status:'ok'});}
 if(p.startsWith('/api/admin/')){
  role(u,['owner','staff']);
	  if(p==='/api/admin/vip'){role(u,['owner']);return json(await saveVipProgram(db,u.id,d));}
	  if(p==='/api/admin/rewards'){role(u,['owner']);return json(await saveRewardsHubProgram(db,u.id,d));}
	  if(p==='/api/admin/engagement'){role(u,['owner']);return json(await saveEngagementProgram(db,u.id,d));}
	  if(p==='/api/admin/game-ranking'){role(u,['owner']);return json(await saveGameRanking(db,u.id,d));}
	  if(p==='/api/admin/game-acceptance'){role(u,['owner']);return json(await recordGameProviderAcceptance(db,u,d),201);}
	  if(p==='/api/admin/production-acceptance'){role(u,['owner']);return json(await recordProductionAcceptance(db,u,d),201);}
  if(p==='/api/admin/risk/bonus-hunter'){
   role(u,['owner']);if(!d.settings||typeof d.settings!=='object'||Array.isArray(d.settings))throw new ApiError(400,'Risk monitor settings are required');const config=await saveBonusRiskConfig(db,d.settings);
   await auditStmt(db,u,'bonus_risk_settings_updated',JSON.stringify({version:config.version,mode:config.mode,thresholds:config.thresholds})).run();
   return json({...await bonusRiskReport(db),canConfigure:true});
  }
		   if(p==='/api/admin/telegram-bot'){
		    role(u,['owner']);if(d.action!=='test')throw new ApiError(400,'Invalid Telegram action');const result=await sendTelegramAdminTest(telegramSettings(c));
		    if(!result.ok)throw new ApiError(result.kind==='not_configured'?503:502,result.kind==='not_configured'?'Telegram Bot is not configured':'Telegram Bot test notification failed');
		    await auditStmt(db,u,'telegram_test_notification_sent',String(result.messageId)).run();return json({status:'ok',sent:true,mode:'outbound_admin_alerts'});
		   }
	   if(p==='/api/admin/payments/gspay/balance'){role(u,['owner']);return queryGSPayBalance(gspayContext);}
	   if(p==='/api/admin/backup'){
	    role(u,['owner']);
	    if(d.action==='record_rehearsal'){const result=await recordPortalRestoreRehearsal(db,RELEASE,u.id,d);return json({status:'ok',verified:true,...(result.idempotent?{idempotent:true}:{})});}
	    if(d.action!=='create')throw new ApiError(400,'Invalid backup action');const backup=await createPortalBackup(db,RELEASE,u.id);return new Response(backup.serialized,{headers:{...responseHeaders,'Content-Disposition':`attachment; filename="${backup.filename}"`}});
	   }
	   if(p==='/api/admin/marketing'){
	    role(u,['owner']);const action=textField(d.action,3,20);
	    if(action==='import'){
	     if(!Array.isArray(d.contacts)||d.contacts.length<1||d.contacts.length>1000)throw new ApiError(400,'Import 1 to 1,000 contacts per batch');const source=typeof d.source==='string'?d.source.trim().slice(0,80)||'csv':'csv',stamp=now(),unique=new Map<string,{phone:string;name:string;consent:string;consentedAt:number|null;consentSource:string;consentProof:string}>();let invalid=0;
	     for(const raw of d.contacts){const phone=malaysiaMarketingPhone(raw?.phone??raw);if(!phone){invalid++;continue;}const name=typeof raw?.name==='string'?raw.name.trim().slice(0,100):'',consent=raw?.consent===true||raw?.consent==='opted_in'?'opted_in':raw?.consent==='opted_out'?'opted_out':'unknown';let consentSource='',consentProof='';if(consent==='opted_in'){consentSource=typeof raw?.consentSource==='string'?raw.consentSource.trim().slice(0,100):'';consentProof=typeof raw?.consentProof==='string'?raw.consentProof.trim().slice(0,500):'';if(!consentSource||!consentProof)throw new ApiError(400,'Consent source and proof are required for opted-in contacts');}else if(consent==='opted_out'){consentSource='imported_suppression';consentProof=typeof raw?.consentProof==='string'&&raw.consentProof.trim()?raw.consentProof.trim().slice(0,500):`Imported by owner from ${source}`;}unique.set(phone,{phone,name,consent,consentedAt:consent==='opted_in'?stamp:null,consentSource,consentProof});}
	     const lockUntil=stamp+120,lock=await db.prepare("INSERT INTO settings(id,value) VALUES('marketing_import_lock',?) ON CONFLICT(id) DO UPDATE SET value=excluded.value WHERE CAST(settings.value AS BIGINT)<? RETURNING value").bind(String(lockUntil),stamp).first<{value:string}>();if(!lock)throw new ApiError(409,'A contact import is already running');
	     try{
	      const counter=await db.prepare("SELECT value FROM settings WHERE id='marketing_contact_count'").first<{value:string}>();let total=Number(counter?.value);
	      if(!Number.isSafeInteger(total)||total<0||total>MARKETING_CONTACT_LIMIT){const recovered=await db.prepare('SELECT COUNT(*) count FROM marketing_contacts').first<{count:number}>();total=Number(recovered?.count??0);if(total>MARKETING_CONTACT_LIMIT)throw new ApiError(409,'Marketing contact limit exceeded');await db.prepare("INSERT INTO settings(id,value) VALUES('marketing_contact_count',?) ON CONFLICT(id) DO UPDATE SET value=excluded.value").bind(String(total)).run();}
	      const items=[...unique.values()],existing=new Set<string>();for(let offset=0;offset<items.length;offset+=250){const phones=items.slice(offset,offset+250).map(item=>item.phone),found=await db.prepare(`SELECT phone FROM marketing_contacts WHERE phone IN (${phones.map(()=>'?').join(',')})`).bind(...phones).all<{phone:string}>();for(const row of found.results??[])existing.add(row.phone);}
	      const imported=items.length-existing.size,nextTotal=total+imported;if(nextTotal>MARKETING_CONTACT_LIMIT)throw new ApiError(409,'Marketing contacts are limited to 1,000,000');
	      const statements:any[]=[];for(let offset=0;offset<items.length;offset+=100){const chunk=items.slice(offset,offset+100),values:any[]=[];for(const item of chunk)values.push(uuid(),item.phone,item.name,item.consent,source,item.consentedAt,item.consentSource,item.consentProof,uuid().replace(/-/g,''),stamp,stamp);statements.push(db.prepare(`INSERT INTO marketing_contacts(id,phone,name,consent_status,source,consented_at,consent_source,consent_proof,unsubscribe_token,created_at,updated_at) VALUES ${chunk.map(()=>'(?,?,?,?,?,?,?,?,?,?,?)').join(',')} ON CONFLICT(phone) DO UPDATE SET name=CASE WHEN excluded.name<>'' THEN excluded.name ELSE marketing_contacts.name END,consent_status=CASE WHEN marketing_contacts.consent_status='opted_out' OR excluded.consent_status='opted_out' THEN 'opted_out' WHEN excluded.consent_status='opted_in' THEN 'opted_in' ELSE marketing_contacts.consent_status END,source=excluded.source,consented_at=CASE WHEN marketing_contacts.consent_status='opted_out' OR excluded.consent_status='opted_out' THEN NULL WHEN excluded.consent_status='opted_in' THEN excluded.consented_at ELSE marketing_contacts.consented_at END,consent_source=CASE WHEN excluded.consent_status IN ('opted_in','opted_out') THEN excluded.consent_source ELSE marketing_contacts.consent_source END,consent_proof=CASE WHEN excluded.consent_status IN ('opted_in','opted_out') THEN excluded.consent_proof ELSE marketing_contacts.consent_proof END,updated_at=excluded.updated_at`).bind(...values));}
	      statements.push(db.prepare("UPDATE settings SET value=? WHERE id='marketing_contact_count'").bind(String(nextTotal)),auditStmt(db,u,'marketing_contacts_imported',`${imported}/${unique.size}`));await db.batch(statements);return json({status:'ok',received:d.contacts.length,valid:unique.size,invalid,imported,duplicates:unique.size-imported,total:nextTotal});
	     }finally{try{await db.prepare("UPDATE settings SET value='0' WHERE id='marketing_import_lock' AND value=?").bind(String(lockUntil)).run();}catch{}}
	    }
	    if(action==='save'){
	     const id=typeof d.id==='string'&&d.id?idField(d.id):uuid(),name=textField(d.name,2,100),channel=['whatsapp','sms','share'].includes(d.channel)?d.channel:'share',message=textField(d.message,3,2000),benefitText=typeof d.benefitText==='string'?d.benefitText.trim().slice(0,1000):'',retentionGoal=optionalInteger(d.retentionGoal,1,MARKETING_CONTACT_LIMIT,'retention goal')??18000,sendRate=optionalInteger(d.sendRatePerMinute,1,10000,'send rate')??30,scheduledAt=d.scheduledAt?Math.floor(new Date(String(d.scheduledAt)).getTime()/1000):null,referralCode=typeof d.referralCode==='string'&&d.referralCode?textField(d.referralCode,8,12).toUpperCase():null;
	     if(channel==='whatsapp'&&message.length>1024)throw new ApiError(400,'WhatsApp template message must be 1,024 characters or fewer');
	     if(scheduledAt!==null&&!Number.isFinite(scheduledAt))throw new ApiError(400,'Invalid schedule time');
	     if(referralCode&&!await db.prepare('SELECT code FROM referral_codes WHERE code=?').bind(referralCode).first())throw new ApiError(400,'Referral code not found');let imageData=typeof d.imageData==='string'?d.imageData:'';if(imageData&&(imageData.length>500000||!/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(imageData)||!validImageData(imageData)))throw new ApiError(400,'Upload a valid JPG, PNG or WebP image under 350 KB');const existing=await db.prepare('SELECT image_data,status FROM marketing_campaigns WHERE id=?').bind(id).first<{image_data:string;status:string}>();if(existing&&['sending','completed'].includes(existing.status))throw new ApiError(409,'Sending or completed campaigns cannot be edited');if(d.clearImage===true)imageData='';else if(!imageData&&existing)imageData=existing.image_data;const whatsapp=whatsappCampaignStatus(whatsappCampaignSettings(c)),status=channel==='share'?'ready':channel==='whatsapp'&&whatsapp.ready?'ready':'blocked',provider=channel==='whatsapp'?'meta_whatsapp_cloud_api':channel==='share'?'manual_export':'unconfigured',templateName=channel==='whatsapp'&&whatsapp.templateName?whatsapp.templateName:'',templateLanguage=channel==='whatsapp'&&whatsapp.templateLanguage?whatsapp.templateLanguage:'',templateParams=channel==='whatsapp'?JSON.stringify({order:whatsapp.parameterOrder}):'{}',stamp=now();
	     if(existing)await db.batch([db.prepare('UPDATE marketing_campaigns SET name=?,channel=?,message=?,image_data=?,benefit_text=?,referral_code=?,retention_goal=?,send_rate_per_minute=?,scheduled_at=?,status=?,provider=?,template_name=?,template_language=?,template_params_json=?,audience_count=0,started_at=NULL,completed_at=NULL,updated_at=? WHERE id=?').bind(name,channel,message,imageData,benefitText,referralCode,retentionGoal,sendRate,scheduledAt,status,provider,templateName,templateLanguage,templateParams,stamp,id),auditStmt(db,u,d.clearImage===true?'marketing_campaign_image_removed':'marketing_campaign_updated',id)]);else await db.batch([db.prepare('INSERT INTO marketing_campaigns(id,name,channel,message,image_data,benefit_text,referral_code,retention_goal,send_rate_per_minute,scheduled_at,status,created_by,created_at,updated_at,provider,template_name,template_language,template_params_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,name,channel,message,imageData,benefitText,referralCode,retentionGoal,sendRate,scheduledAt,status,u.id,stamp,stamp,provider,templateName,templateLanguage,templateParams),auditStmt(db,u,'marketing_campaign_created',id)]);return json({status:'ok',id,campaignStatus:status,imageAvailable:!!imageData,providerReady:whatsapp.ready,whatsapp},existing?200:201);
	    }
	    if(action==='launch')return json(await launchWhatsAppCampaign(whatsappCampaignSettings(c),idField(d.id),u.id));
	    if(action==='contact_update'){
	     const id=idField(d.id),existing=await db.prepare('SELECT phone,consent_status,consented_at,consent_source,consent_proof FROM marketing_contacts WHERE id=?').bind(id).first<{phone:string;consent_status:string;consented_at:number|null;consent_source:string;consent_proof:string}>();if(!existing)throw new ApiError(404,'Marketing contact not found');const name=typeof d.name==='string'?d.name.trim().slice(0,100):'',consentStatus=String(d.consentStatus??'unknown');if(!['opted_in','unknown','opted_out'].includes(consentStatus))throw new ApiError(400,'Invalid consent status');if(existing.consent_status==='opted_out'&&consentStatus!=='opted_out')throw new ApiError(409,'退订抑制记录不能重新启用');if(existing.consent_status==='opted_in'&&consentStatus==='unknown')throw new ApiError(409,'已同意联系人必须先退订，不能改回待确认');let consentSource=typeof d.consentSource==='string'?d.consentSource.trim().slice(0,100):'',consentProof=typeof d.consentProof==='string'?d.consentProof.trim().slice(0,500):'';if(consentStatus==='opted_out'){consentSource=consentSource||existing.consent_source||'owner_opt_out';consentProof=consentProof||existing.consent_proof||'Administrator recorded opt-out';}if(consentStatus==='opted_in'&&(!consentSource||!consentProof))throw new ApiError(400,'Consent source and proof are required for opted-in contacts');const stamp=now(),consentedAt=consentStatus==='opted_in'?(existing.consent_status==='opted_in'&&existing.consented_at?existing.consented_at:stamp):null,statements=[db.prepare('UPDATE marketing_contacts SET name=?,consent_status=?,consented_at=?,consent_source=?,consent_proof=?,updated_at=? WHERE id=?').bind(name,consentStatus,consentedAt,consentSource,consentProof,stamp,id),auditStmt(db,u,consentStatus==='opted_out'?'marketing_contact_opted_out':'marketing_contact_consent_updated',`${id}:${existing.phone.slice(-4)}`)];if(consentStatus==='opted_out')statements.push(db.prepare("UPDATE marketing_deliveries SET status='opted_out',claim_token=NULL,locked_until=0,updated_at=? WHERE contact_id=? AND status IN ('queued','submitting','unknown','failed')").bind(stamp,id));await db.batch(statements);return json({status:'ok'});
	    }
	    if(action==='contact_delete'){const id=idField(d.id),existing=await db.prepare('SELECT phone,consent_status FROM marketing_contacts WHERE id=?').bind(id).first<{phone:string;consent_status:string}>();if(!existing)throw new ApiError(404,'Marketing contact not found');if(existing.consent_status!=='unknown')throw new ApiError(409,existing.consent_status==='opted_out'?'退订记录必须永久保留，不能删除':'请先退订；退订抑制记录必须保留');await db.batch([db.prepare('DELETE FROM marketing_contacts WHERE id=?').bind(id),db.prepare("UPDATE settings SET value=CASE WHEN CAST(value AS BIGINT)>0 THEN CAST(CAST(value AS BIGINT)-1 AS TEXT) ELSE '0' END WHERE id='marketing_contact_count'"),auditStmt(db,u,'marketing_contact_deleted',existing.phone.slice(-4))]);return json({status:'ok'});}
	    if(action==='opt_out'){const phone=malaysiaMarketingPhone(d.phone);if(!phone)throw new ApiError(400,'Invalid Malaysian phone');const existing=await db.prepare('SELECT id FROM marketing_contacts WHERE phone=?').bind(phone).first<{id:string}>();if(!existing)throw new ApiError(404,'Marketing contact not found');const stamp=now(),proof=typeof d.proof==='string'?d.proof.trim().slice(0,500):'Administrator recorded opt-out';await db.batch([db.prepare("UPDATE marketing_contacts SET consent_status='opted_out',consented_at=NULL,consent_source='owner_opt_out',consent_proof=?,updated_at=? WHERE phone=?").bind(proof,stamp,phone),db.prepare("UPDATE marketing_deliveries SET status='opted_out',claim_token=NULL,locked_until=0,updated_at=? WHERE contact_id=? AND status IN ('queued','submitting','unknown','failed')").bind(stamp,existing.id),auditStmt(db,u,'marketing_contact_opted_out',phone.slice(-4))]);return json({status:'ok'});}
	    throw new ApiError(400,'Invalid marketing action');
	   }
  if(p==='/api/admin/game-sync'){const catalogue=await automaticCatalogue(c,await getGameCatalogue(c,{force:true}));await auditStmt(db,u,'game_catalogue_sync','catalogue').run();return json({...automaticAvailability,providers:catalogue.providers,gameCount:catalogue.games.length,syncIntervalSeconds:300,playable:catalogue.playable});}
  if(p==='/api/admin/withdrawals/status'){role(u,['owner']);return cancelWithdrawal(d,await withdrawalSettings(c,u));}
  if(p==='/api/admin/withdrawals/approve'){role(u,['owner']);return approveWithdrawal(d,await withdrawalSettings(c,u));}
  if(p==='/api/admin/supplier-art'){
   role(u,['owner']);const providerId=textField(d.providerId,1,32);if(!apiSupplierIds.includes(providerId))throw new ApiError(400,'Invalid supplier');
   if(typeof d.imageData!=='string'||!d.imageData||d.imageData.length>500000||!/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(d.imageData)||!validImageData(d.imageData))throw new ApiError(400,'Upload a valid JPG, PNG or WebP image under 350 KB');
   const timestamp=now();await db.batch([db.prepare("INSERT INTO api_supplier_artwork(provider_id,image_data,status,updated_by,updated_at) VALUES(?,?,'active',?,?) ON CONFLICT(provider_id) DO UPDATE SET image_data=excluded.image_data,updated_by=excluded.updated_by,updated_at=excluded.updated_at").bind(providerId,d.imageData,u.id,timestamp),auditStmt(db,u,'api_supplier_artwork_updated',providerId)]);return json({...automaticAvailability,status:'ok',providerId,updatedAt:timestamp});
  }
  if(p==='/api/admin/ads'){
   const action=textField(d.action,3,10);
   if(action==='delete'){
    const id=idField(d.id);if(!await db.prepare('SELECT id FROM lobby_ads WHERE id=?').bind(id).first())throw new ApiError(404,'Ad not found');
    await db.batch([db.prepare('DELETE FROM lobby_ads WHERE id=?').bind(id),auditStmt(db,u,'lobby_ad_deleted',id)]);return json({status:'ok'});
   }
   if(action==='toggle'){
    const id=idField(d.id),status=d.status??(d.enabled===true?'published':d.enabled===false?'draft':null);if(!['draft','published'].includes(status))throw new ApiError(400,'Invalid advertisement status');const existing=await db.prepare('SELECT id,title,image_data,target_url FROM lobby_ads WHERE id=?').bind(id).first<{id:string;title:string;image_data:string;target_url:string}>();if(!existing)throw new ApiError(404,'Ad not found');if(status==='published')assertAdvertisementPublishable(existing);
    await db.batch([db.prepare('UPDATE lobby_ads SET enabled=?,status=?,updated_at=? WHERE id=?').bind(status==='published'?1:0,status,now(),id),auditStmt(db,u,status==='published'?'lobby_ad_published':'lobby_ad_drafted',id)]);return json({status:'ok',adStatus:status});
   }
   if(action==='save'){
    const id=typeof d.id==='string'&&d.id? idField(d.id):uuid(),title=textField(d.title,2,100),target=advertisementUrl(d.targetUrl),status=d.status??(d.enabled===true?'published':'draft'),position=Number.isInteger(d.position)&&d.position>=0&&d.position<1000?d.position:0,{startsAt,endsAt}=scheduleWindow(d.startsAt,d.endsAt);if(!['draft','published'].includes(status))throw new ApiError(400,'Invalid advertisement status');const enabled=status==='published';
    let imageData=typeof d.imageData==='string'?d.imageData:'';
    if(imageData){if(imageData.length>500000||!/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(imageData)||!validImageData(imageData))throw new ApiError(400,'Upload a valid JPG, PNG or WebP image under 350 KB');}
    const existing=await db.prepare('SELECT id,image_data FROM lobby_ads WHERE id=?').bind(id).first<{id:string;image_data:string}>();
    if(!imageData&&existing)imageData=existing.image_data;
    if(!imageData)throw new ApiError(400,'Ad image is required');
    if(enabled)assertAdvertisementPublishable({title,image_data:imageData,target_url:target});
    if(existing){await db.batch([db.prepare('UPDATE lobby_ads SET title=?,image_data=?,target_url=?,enabled=?,status=?,starts_at=?,ends_at=?,position=?,updated_at=? WHERE id=?').bind(title,imageData,target,enabled?1:0,status,startsAt,endsAt,position,now(),id),auditStmt(db,u,'lobby_ad_updated',id)]);}
    else{const count=await db.prepare('SELECT COUNT(*) AS count FROM lobby_ads').first<{count:number}>();if(Number(count?.count??0)>=20)throw new ApiError(409,'The lobby supports up to 20 ads');await db.batch([db.prepare('INSERT INTO lobby_ads(id,title,image_data,target_url,enabled,status,starts_at,ends_at,position,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,title,imageData,target,enabled?1:0,status,startsAt,endsAt,position,u.id,now(),now()),auditStmt(db,u,'lobby_ad_created',id)]);}
    return json({status:'ok',id,adStatus:status},existing?200:201);
   }
   throw new ApiError(400,'Invalid ad action');
  }
  if(p==='/api/admin/custom-games'){
   role(u,['owner']);
   const action=textField(d.action,3,10);
   if(action==='delete'){
    const id=idField(d.id);if(!await db.prepare('SELECT id FROM custom_game_cards WHERE id=?').bind(id).first())throw new ApiError(404,'Game card not found');
    await db.batch([db.prepare('DELETE FROM custom_game_cards WHERE id=?').bind(id),auditStmt(db,u,'custom_game_deleted',id)]);return json({...automaticAvailability,status:'ok'});
   }
   if(action==='save'){
    const id=typeof d.id==='string'&&d.id?idField(d.id):uuid(),title=textField(d.title,2,100),isPlatformMini=d.isPlatformMini===true,providerName=isPlatformMini?'MASTER7 Mini Games':textField(d.providerName,2,80),gameCode=typeof d.gameCode==='string'?d.gameCode.trim().slice(0,100):'',category=typeof d.category==='string'?d.category.trim().slice(0,40):'',position=optionalInteger(d.position,0,999,'position')??0;
    let imageData=typeof d.imageData==='string'?d.imageData:'';if(imageData&&(imageData.length>500000||!/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(imageData)||!validImageData(imageData)))throw new ApiError(400,'Upload a valid JPG, PNG or WebP image under 350 KB');
    const existing=await db.prepare('SELECT id,image_data,is_platform_mini FROM custom_game_cards WHERE id=?').bind(id).first<{id:string;image_data:string;is_platform_mini:number}>();if(!imageData&&existing)imageData=existing.image_data;if(!imageData)throw new ApiError(400,'Game image is required');
    if(isPlatformMini&&(!existing||!Number(existing.is_platform_mini))){const count=await db.prepare('SELECT COUNT(*) AS count FROM custom_game_cards WHERE is_platform_mini=1').first<{count:number}>();if(Number(count?.count??0)>=5)throw new ApiError(409,'Only five MASTER7 platform mini-game cards are allowed');}
    if(existing){await db.batch([db.prepare('UPDATE custom_game_cards SET title=?,provider_name=?,game_code=?,category=?,image_data=?,is_platform_mini=?,position=?,updated_at=? WHERE id=?').bind(title,providerName,gameCode,category,imageData,isPlatformMini?1:0,position,now(),id),auditStmt(db,u,'custom_game_updated',id)]);}
    else{const count=await db.prepare('SELECT COUNT(*) AS count FROM custom_game_cards').first<{count:number}>();if(Number(count?.count??0)>=100)throw new ApiError(409,'The lobby supports up to 100 custom game cards');await db.batch([db.prepare('INSERT INTO custom_game_cards(id,title,provider_name,game_code,category,image_data,is_platform_mini,enabled,status,position,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,title,providerName,gameCode,category,imageData,isPlatformMini?1:0,0,'closed',position,u.id,now(),now()),auditStmt(db,u,'custom_game_created',id)]);}
    return json({status:'ok',id},existing?200:201);
   }
   throw new ApiError(400,'Invalid game-card action');
  }
  if(p==='/api/admin/benefits'){
   role(u,['owner']);
   const action=textField(d.action,3,10);
   if(action==='review'){
    const id=idField(d.id),decision=d.decision,note=typeof d.note==='string'?d.note.trim().slice(0,500):'';
    if(!['approve','reject'].includes(decision))throw new ApiError(400,'Invalid benefit review decision');
    if(decision==='reject'&&!note)throw new ApiError(400,'A rejection note is required');
    const claim=await db.prepare("SELECT id,status,review_status,expires_at FROM benefit_claims WHERE id=? AND benefit_rule_id<>'new-member-rm88-sponsored'").bind(id).first<{id:string;status:string;review_status:string;expires_at:number}>();
    if(!claim)throw new ApiError(404,'Benefit claim not found');
    if(claim.review_status!=='pending'){
     const expected=decision==='approve'?'approved_pending_settlement':'rejected';
     if(claim.review_status===expected)return json({status:'ok',id,reviewStatus:claim.review_status,idempotent:true,walletCredited:false,turnoverEnforced:false});
     throw new ApiError(409,'Benefit claim already reviewed');
    }
    if(claim.status!=='awaiting_acceptance'||Number(claim.expires_at)<=now()){
     if(claim.status==='awaiting_acceptance'&&Number(claim.expires_at)<=now())await db.prepare("UPDATE benefit_claims SET status='expired',updated_at=? WHERE id=? AND status='awaiting_acceptance'").bind(now(),id).run();
     throw new ApiError(409,'Benefit claim is no longer awaiting review');
    }
    const stamp=now(),reviewStatus=decision==='approve'?'approved_pending_settlement':'rejected',claimStatus=decision==='reject'?'rejected':'awaiting_acceptance';
    await db.batch([db.prepare('UPDATE benefit_claims SET status=?,review_status=?,reviewed_by=?,reviewed_at=?,review_note=?,updated_at=? WHERE id=? AND review_status=\'pending\'').bind(claimStatus,reviewStatus,u.id,stamp,note,stamp,id),auditStmt(db,u,decision==='approve'?'benefit_claim_eligibility_approved':'benefit_claim_rejected',`${id}:${note||'no-note'}`)]);
    return json({status:'ok',id,reviewStatus,walletCredited:false,turnoverEnforced:false,settlementRequired:decision==='approve'});
   }
   if(action==='delete'){
    const id=idField(d.id);if(!await db.prepare('SELECT id FROM benefit_rules WHERE id=?').bind(id).first())throw new ApiError(404,'Benefit not found');
    await db.batch([db.prepare('DELETE FROM benefit_rules WHERE id=?').bind(id),auditStmt(db,u,'benefit_rule_deleted',id)]);return json({status:'ok'});
   }
   if(action==='toggle'){
    const id=idField(d.id),status=d.status;if(!['draft','active'].includes(status))throw new ApiError(400,'Invalid benefit status');const existing=await db.prepare('SELECT id,rules_json FROM benefit_rules WHERE id=?').bind(id).first<{id:string;rules_json:string}>();if(!existing)throw new ApiError(404,'Benefit not found');if(status==='active'){let rules:any;try{rules=JSON.parse(existing.rules_json);}catch{throw new ApiError(409,'Benefit rules are invalid; save the draft again');}assertBenefitPublishable(rules);}
    await db.batch([db.prepare('UPDATE benefit_rules SET status=?,updated_at=? WHERE id=?').bind(status,now(),id),auditStmt(db,u,status==='active'?'benefit_rule_published':'benefit_rule_unpublished',id)]);return json({status:'ok'});
   }
   if(action==='save'){
    const id=typeof d.id==='string'&&d.id?idField(d.id):uuid(),title=textField(d.title,2,100),description=textField(d.description,3,2000),rewardType=textField(d.rewardType,3,32);
    if(!['deposit_bonus','cashback','free_credit','vip','referral','turnover','other'].includes(rewardType))throw new ApiError(400,'Invalid benefit type');
    const turnoverBase=d.turnoverBase??'deposit_plus_bonus';if(!['deposit','bonus','deposit_plus_bonus'].includes(turnoverBase))throw new ApiError(400,'Invalid turnover base');
    const providerId=d.providerId??'all';if(providerId!=='all'&&!apiSupplierIdSet.has(providerId))throw new ApiError(400,'Invalid sponsored provider');const existing=await db.prepare('SELECT id,rules_json FROM benefit_rules WHERE id=?').bind(id).first<{id:string;rules_json:string}>();let previousRules:any={};try{if(existing)previousRules=JSON.parse(existing.rules_json);}catch{}const preserved:any={};for(const key of ['campaignKey','campaignStartsAt','sponsoredProviderIds','lifetimeClaimLimit'])if(Object.hasOwn(previousRules,key))preserved[key]=previousRules[key];const newMemberOnly=d.newMemberOnly===true;
    const rules={currency:'MYR',providerId,rewardType,rewardAmountMYR:optionalNumber(d.rewardAmountMYR,0,1000000,'reward amount'),rewardPercent:optionalNumber(d.rewardPercent,0,1000,'reward percent'),minDepositMYR:optionalNumber(d.minDepositMYR,0,1000000,'minimum deposit'),maxRewardMYR:optionalNumber(d.maxRewardMYR,0,1000000,'maximum reward'),turnoverMultiplier:optionalNumber(d.turnoverMultiplier,0,1000,'turnover multiplier'),turnoverBase,turnoverRequiredMYR:optionalNumber(d.turnoverRequiredMYR,0,100000000,'turnover amount'),withdrawalCapMYR:optionalNumber(d.withdrawalCapMYR,0,1000000,'withdrawal cap'),freeChances:optionalInteger(d.freeChances,0,100,'free chances'),stopFreeChancesOnFirstWin:d.stopFreeChancesOnFirstWin===true,newMemberOnly,claimLimitPerMember:optionalInteger(d.claimLimitPerMember,1,100000,'claim limit'),validityDays:optionalInteger(d.validityDays,1,3650,'validity'),...preserved,...(newMemberOnly&&!Object.hasOwn(preserved,'campaignStartsAt')?{campaignStartsAt:now(),lifetimeClaimLimit:true}:{})};
    const status=d.status==='active'?'active':'draft';
    if(status==='active')assertBenefitPublishable(rules);
    if(existing)await db.batch([db.prepare('UPDATE benefit_rules SET title=?,description=?,rules_json=?,status=?,updated_at=? WHERE id=?').bind(title,description,JSON.stringify(rules),status,now(),id),auditStmt(db,u,'benefit_rule_updated',id)]);
    else await db.batch([db.prepare('INSERT INTO benefit_rules(id,title,description,rules_json,status,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').bind(id,title,description,JSON.stringify(rules),status,u.id,now(),now()),auditStmt(db,u,'benefit_rule_created',id)]);
    return json({status:'ok',id,ruleStatus:status},existing?200:201);
   }
   throw new ApiError(400,'Invalid benefit action');
  }
  if(p==='/api/admin/referrals'){
   role(u,['owner']);
   if(d.action==='run'){
    const config=await referralSettings(db),preview=await commissionPreview(db,config);if(!preview.calculationEnabled){await auditStmt(db,u,'commission_preview_blocked',preview.reason||'disabled').run();return json({status:'blocked',preview,persisted:null,walletCredited:false,commissionWithdrawable:false,message:preview.reason||'Commission preview is disabled.'});}const persisted=await persistCommissionPreview(db,u.id,config,preview);await auditStmt(db,u,'commission_period_previewed',`${preview.period.start}:${preview.period.end}:${preview.totalCommissionMinor}`).run();return json({status:'ok',preview,persisted,walletCredited:false,commissionWithdrawable:false,message:'Period preview persisted. Claiming and wallet credit remain disabled.'});
   }
   let value:any;
   if(d.settings!==undefined)value=commissionInput(d.settings);
   else{if(typeof d.enabled!=='boolean')throw new ApiError(400,'Invalid referral state');const ratePercent=Number(d.ratePercent);if(!Number.isFinite(ratePercent)||ratePercent<0||ratePercent>100)throw new ApiError(400,'Referral commission must be between 0% and 100%');value=normalizedCommissionSettings({enabled:d.enabled,rateBasisPoints:Math.round(ratePercent*100)});}
   const rateBasisPoints=Math.round(value.tierRatesPercent[0]*100);await db.batch([db.prepare("INSERT INTO settings(id,value) VALUES('referral_program',?) ON CONFLICT(id) DO UPDATE SET value=excluded.value").bind(JSON.stringify(value)),auditStmt(db,u,'referral_program_updated',`${value.enabled?'active':'closed'}:${value.basis}:${rateBasisPoints}`)]);return json({status:'ok',configured:true,settings:{...value,rateBasisPoints,configured:true},...value,rateBasisPoints,ratePercent:rateBasisPoints/100,walletCreditAutomation:false,settlementMode:'preview_only'});
  }
  if(p==='/api/admin/support-settings'){
   role(u,['owner']);if(typeof d.aiEnabled!=='boolean'||typeof d.humanHandoff!=='boolean')throw new ApiError(400,'Invalid support automation settings');const value={aiEnabled:d.aiEnabled,humanHandoff:d.humanHandoff};await db.batch([db.prepare("INSERT INTO settings(id,value) VALUES('support_automation',?) ON CONFLICT(id) DO UPDATE SET value=excluded.value").bind(JSON.stringify(value)),auditStmt(db,u,'support_automation_updated',`${value.aiEnabled?'active':'off'}:${value.humanHandoff?'handoff':'no-handoff'}`)]);return json(await supportAutomationSettings(db,c));
  }
  if(p==='/api/admin/announcement'){
   const action=typeof d.action==='string'?textField(d.action,3,10):'save';
   if(action==='delete'){const id=idField(d.id);if(!await db.prepare('SELECT id FROM announcements WHERE id=?').bind(id).first())throw new ApiError(404,'Announcement not found');await db.batch([db.prepare('DELETE FROM announcements WHERE id=?').bind(id),auditStmt(db,u,'announcement_deleted',id)]);return json({status:'ok'});}
   if(action==='toggle'){const id=idField(d.id),status=d.status;if(!['draft','published'].includes(status))throw new ApiError(400,'Invalid announcement status');if(!await db.prepare('SELECT id FROM announcements WHERE id=?').bind(id).first())throw new ApiError(404,'Announcement not found');await db.batch([db.prepare('UPDATE announcements SET status=?,updated_at=? WHERE id=?').bind(status,now(),id),auditStmt(db,u,`announcement_${status}`,id)]);return json({status:'ok',announcementStatus:status});}
   if(action==='save'){
    const title=textField(d.title,3,100),content=textField(d.body,5,1000),id=typeof d.id==='string'&&d.id?idField(d.id):uuid(),status=d.status??'published',{startsAt,endsAt}=scheduleWindow(d.startsAt,d.endsAt);if(!['draft','published'].includes(status))throw new ApiError(400,'Invalid announcement status');const existing=await db.prepare('SELECT id FROM announcements WHERE id=?').bind(id).first(),stamp=now();
    if(existing)await db.batch([db.prepare('UPDATE announcements SET title=?,body=?,status=?,starts_at=?,ends_at=?,updated_at=? WHERE id=?').bind(title,content,status,startsAt,endsAt,stamp,id),auditStmt(db,u,'announcement_updated',id)]);
    else await db.batch([db.prepare('INSERT INTO announcements(id,title,body,status,starts_at,ends_at,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,title,content,status,startsAt,endsAt,u.id,stamp,stamp),auditStmt(db,u,'announcement_created',id)]);
    return json({status:'ok',id,announcementStatus:status},existing?200:201);
   }
   throw new ApiError(400,'Invalid announcement action');
  }
  if(p==='/api/admin/ticket-status'){const id=idField(d.ticketId);if(!['open','closed'].includes(d.status))throw new ApiError(400,'Invalid status');if(!await db.prepare('SELECT id FROM tickets WHERE id=?').bind(id).first())throw new ApiError(404,'Ticket not found');await db.batch([db.prepare('UPDATE tickets SET status=? WHERE id=?').bind(d.status,id),auditStmt(db,u,'ticket_'+d.status,id)]);return json({status:'ok'});}
  if(p==='/api/admin/game-visibility'){
   role(u,['owner']);
   const providerId=textField(d.providerId,1,32),gameCode=textField(d.gameCode,1,100);if(!gameControlSourceIds.includes(providerId))throw new ApiError(400,'Invalid game provider');
   const categoryOverride=d.category===undefined?undefined:d.category;if(categoryOverride!==undefined&&categoryOverride!==''&&!vendorCategories.includes(categoryOverride as VendorCategory))throw new ApiError(400,'Invalid game category');
   const accessZone=d.accessZone===undefined?undefined:d.accessZone;if(accessZone!==undefined&&!['free','paid'].includes(accessZone))throw new ApiError(400,'Invalid game access zone');
   if(d.imageData===undefined&&categoryOverride===undefined&&accessZone===undefined)throw new ApiError(400,'A category, access zone or game image is required');
   let imageData:string|undefined;if(d.imageData!==undefined){if(typeof d.imageData!=='string'||d.imageData.length>500000||d.imageData!==''&&(!/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(d.imageData)||!validImageData(d.imageData)))throw new ApiError(400,'Upload a valid JPG, PNG or WebP image under 350 KB');imageData=d.imageData;}
   const key=`${providerId}:${gameCode}`,existing=await db.prepare('SELECT image_data,category_override,access_zone FROM game_visibility WHERE provider_id=? AND game_code=?').bind(providerId,gameCode).first<{image_data:string;category_override:string;access_zone:string}>(),nextImage=imageData??existing?.image_data??'',nextCategory=categoryOverride===undefined?existing?.category_override??'':categoryOverride,nextZone=accessZone??existing?.access_zone??'paid';
   const event=accessZone!==undefined&&categoryOverride===undefined&&imageData===undefined?'game_access_zone_updated':imageData!==undefined&&categoryOverride===undefined&&accessZone===undefined?'game_artwork_updated':'game_editorial_updated';
   await db.batch([db.prepare("INSERT INTO game_visibility(provider_id,game_code,visible,status,image_data,category_override,access_zone,updated_by,updated_at) VALUES(?,?,1,'active',?,?,?,?,?) ON CONFLICT(provider_id,game_code) DO UPDATE SET image_data=excluded.image_data,category_override=excluded.category_override,access_zone=excluded.access_zone,updated_by=excluded.updated_by,updated_at=excluded.updated_at").bind(providerId,gameCode,nextImage,nextCategory,nextZone,u.id,now()),auditStmt(db,u,event,`${key}:${nextZone}`)]);
   return json({...automaticAvailability,status:'ok',accessZone:nextZone,artworkSaved:imageData!==undefined});
  }
  if(p==='/api/admin/provider'){
   role(u,['owner']);
   const id=idField(d.id);if(d.imageData===undefined)throw new ApiError(400,'A provider image is required');
   const existing=await db.prepare('SELECT image_data FROM providers WHERE id=?').bind(id).first<{image_data:string}>();if(!existing)throw new ApiError(404,'Provider not found');
   if(typeof d.imageData!=='string'||d.imageData.length>500000||d.imageData!==''&&(!/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(d.imageData)||!validImageData(d.imageData)))throw new ApiError(400,'Upload a valid JPG, PNG or WebP image under 350 KB');
   await db.batch([db.prepare('UPDATE providers SET image_data=? WHERE id=?').bind(d.imageData,id),auditStmt(db,u,'provider_artwork_updated',id)]);return json({...automaticAvailability,status:'ok',providerId:id,artworkSaved:true});
  }
  if(p==='/api/admin/brand-directory')throw new ApiError(410,'Legacy brand directory is retired; use Supplier APIs and Game controls.');
  role(u,['owner']);
  if(p==='/api/admin/approve'||p==='/api/admin/role'){const id=idField(d.userId);if(id==='system-support-assistant')throw new ApiError(403,'System account protected');const target=await db.prepare('SELECT role FROM users WHERE id=?').bind(id).first<{role:string}>();if(!target)throw new ApiError(404,'User not found');if(target.role==='owner')throw new ApiError(403,'Administrator account protected');if(p.endsWith('/role')){if(!['member','staff'].includes(d.role))throw new ApiError(400,'Invalid role');const result=await changeLocalUserRole(db,u.id,id,d.role);if(!result.staffSetup)return json({status:'ok',changed:result.changed});const username=result.staffSetup.username&&/^[a-zA-Z0-9_]{4,32}$/.test(result.staffSetup.username)?result.staffSetup.username:null,fragment=new URLSearchParams({userId:result.staffSetup.userId,code:result.staffSetup.code,...(username?{username}:{})}).toString();return json({status:'ok',changed:true,staffSetup:{username,expiresAt:result.staffSetup.expiresAt,setupUrl:`/staff-setup#staff-setup=${encodeURIComponent(fragment)}`}});}await db.batch([db.prepare('UPDATE users SET approved=1 WHERE id=?').bind(id),auditStmt(db,u,'user_approved',id)]);return json({status:'ok'});}
  if(p==='/api/admin/social-links'){
   const row=await db.prepare("SELECT value FROM settings WHERE id='social'").first<{value:string}>(),current=row?storedSocial((()=>{try{return JSON.parse(row.value);}catch{return {};}})()):{...socialDefaults};
   const expected=d.expectedRevision===undefined?current.revision:Number(d.expectedRevision);if(!Number.isSafeInteger(expected)||expected!==current.revision)throw new ApiError(409,'Settings changed; reload and try again');
   const input=socialPayload(d,current),revision=current.revision+1,changeId=uuid(),value=storedSocial({...input,revision}),serialized=JSON.stringify({...value,changeId}),initial=row?.value??JSON.stringify({...socialDefaults}),revisionId=uuid(),auditId=uuid(),createdAt=now();
   const result=await db.batch([
    db.prepare("INSERT INTO settings(id,value) VALUES('social',?) ON CONFLICT(id) DO NOTHING").bind(initial),
    db.prepare("UPDATE settings SET value=? WHERE id='social' AND value=?").bind(serialized,initial),
    db.prepare("INSERT INTO public_contact_revisions(id,revision,configuration,created_by,created_at) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM settings WHERE id='social' AND value=?)").bind(revisionId,revision,serialized,u.id,createdAt,serialized),
    db.prepare("INSERT INTO audit(id,user_id,event,target,created_at) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM public_contact_revisions WHERE id=?)").bind(auditId,u.id,'contact_and_pixel_settings_updated',`social:revision:${revision}`,createdAt,revisionId)
   ]),changed=Number((result[1] as any)?.meta?.changes??(result[1] as any)?.changes??0);if(changed!==1)throw new ApiError(409,'Settings changed; reload and try again');
   return json({status:'ok',revision});
  }
 }
 throw new ApiError(404,'Not found');
}
