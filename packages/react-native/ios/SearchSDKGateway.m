#import <React/RCTBridgeModule.h>
#import <React/RCTInvalidating.h>

@interface RCT_EXTERN_MODULE(SearchSDKGateway, NSObject)
RCT_EXTERN_METHOD(request:(NSString *)identifier
                  endpoint:(NSString *)endpoint
                  headers:(NSDictionary *)headers
                  body:(NSString *)body
                  maxBytes:(double)maxBytes
                  timeoutMs:(double)timeoutMs
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(cancel:(NSString *)identifier)
@end
