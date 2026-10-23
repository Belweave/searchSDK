use crate::types::SearchAttempt;
use serde::{Deserialize, Serialize};
use std::fmt;
pub type Result<T> = std::result::Result<T, Error>;
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCode {
    InvalidRequest,
    UnsupportedOption,
    Configuration,
    Auth,
    RateLimit,
    Network,
    Unavailable,
    AttemptTimeout,
    Timeout,
    Aborted,
    InvalidResponse,
    ProviderError,
}
impl ErrorCode {
    pub(crate) fn transient(self) -> bool {
        matches!(
            self,
            Self::RateLimit | Self::Network | Self::Unavailable | Self::AttemptTimeout
        )
    }
}
/// Only sanitized codes and numeric HTTP metadata; never upstream messages or URLs.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Error {
    pub code: ErrorCode,
    #[serde(
        default,
        deserialize_with = "crate::types::present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub status: Option<u16>,
    #[serde(
        default,
        deserialize_with = "crate::types::present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub retry_after_ms: Option<f64>,
    pub attempts: Vec<SearchAttempt>,
}
impl Error {
    pub fn new(code: ErrorCode) -> Self {
        Self {
            code,
            status: None,
            retry_after_ms: None,
            attempts: Vec::new(),
        }
    }
    pub(crate) fn status(status: u16) -> Self {
        let code = match status {
            401 | 402 | 403 | 432 | 433 => ErrorCode::Auth,
            429 => ErrorCode::RateLimit,
            408 | 500..=599 => ErrorCode::Unavailable,
            _ => ErrorCode::ProviderError,
        };
        Self {
            status: Some(status),
            ..Self::new(code)
        }
    }
}
impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "searchsdk {:?}", self.code)
    }
}
impl std::error::Error for Error {}
