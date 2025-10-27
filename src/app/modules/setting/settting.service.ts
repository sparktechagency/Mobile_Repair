import  Settings, { ISettings } from "./setting.model";


// Get the settings
const getSettingsByKey = async (payload: {key: "privacyPolicy"|"aboutUs"|"termsService"|"gdpr"|"howOrderingWorks"|"howItWorks"|"frameworkAgreement" }): Promise<ISettings | null> => {
    return await Settings.findOne(payload).sort({ createdAt: -1 });
};

// Create or update the privacy policy
const updateSettingsByKey = async (key: "privacyPolicy"|"aboutUs"|"termsService"|"gdpr"|"howOrderingWorks"|"howItWorks"|"frameworkAgreement", content: string): Promise<ISettings> => {
    let policy = await Settings.findOne({key});
    if (!policy) {
        policy = new Settings({key, content });
    } else {
        policy.content = content;
    }
    return await policy.save();
};

export const settingsService = {
    getSettingsByKey,
    updateSettingsByKey
};
