//
//  AppError.swift
//  SolPlayer
//
//  Created by Morioka Naoya on H28/06/06.
//  Copyright © 平成28年 Morioka Naoya. All rights reserved.
//

import Foundation

enum AppError: Error {
    case NoPlayListError
    case CantReadFileError
    case CantPlayError
    case NoSongError
    case CantLoadError
    case CantSaveError
    case CantMakePlaylistError
    case CantRemoveError
}
